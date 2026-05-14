'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { supabase } from '@/lib/supabase';
import { FileCode2, Play, Save, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ExamPage({ params }: { params: Promise<{ studentId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;
  
  const [code, setCode] = useState('<!-- Tapez votre code HTML ici -->\n<h1>Bonjour le monde!</h1>');
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [isFinished, setIsFinished] = useState(false);
  const [cheatLogs, setCheatLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Load existing submission
    const loadSubmission = async () => {
      const { data: studentData } = await supabase
        .from('students')
        .select('test_status')
        .eq('id', studentId)
        .single();
        
      if (studentData?.test_status === 'completed') {
        setIsFinished(true);
      }

      const { data } = await supabase
        .from('submissions')
        .select('html_code, cheat_logs')
        .eq('student_id', studentId)
        .single();
        
      if (data) {
        if (data.html_code) setCode(data.html_code);
        if (data.cheat_logs) setCheatLogs(data.cheat_logs);
      }
    };
    loadSubmission();
  }, [studentId]);

  // Anti-Cheat System
  useEffect(() => {
    if (isFinished) return;

    const logCheat = async (type: string, details: string) => {
      const newLog = { type, details, time: new Date().toISOString() };
      const updatedLogs = [...cheatLogs, newLog];
      setCheatLogs(updatedLogs);

      // Update DB
      await supabase.from('submissions')
        .update({ cheat_logs: updatedLogs })
        .eq('student_id', studentId);
        
      await supabase.from('students')
        .update({ is_cheater: true })
        .eq('id', studentId);
        
      alert(`Alerte de sécurité : ${details}`);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logCheat('tab_switch', "L'étudiant a quitté l'onglet de l'examen.");
      }
    };

    const handleBlur = () => {
      logCheat('focus_loss', "L'étudiant a changé de fenêtre ou a perdu le focus.");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logCheat('paste_attempt', "Tentative de copier-coller détectée dans la fenêtre.");
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('paste', handlePaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('paste', handlePaste);
    };
  }, [cheatLogs, isFinished, studentId]);

  // Timer & Auto-Save
  useEffect(() => {
    if (isFinished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const autoSave = setInterval(() => {
      saveCode();
    }, 60000); // 60 seconds

    return () => {
      clearInterval(timer);
      clearInterval(autoSave);
    };
  }, [code, isFinished]);

  const saveCode = async () => {
    setIsSaving(true);
    await supabase.from('submissions')
      .update({ html_code: code, time_spent_seconds: 30 * 60 - timeLeft })
      .eq('student_id', studentId);
    setIsSaving(false);
  };

  const handleFinish = async () => {
    if (isFinished) return;
    setIsFinished(true);
    await saveCode();
    await supabase.from('students')
      .update({ test_status: 'completed' })
      .eq('id', studentId);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Disable paste inside Monaco Editor
    editor.onKeyDown((e: any) => {
      // CMD+V or CTRL+V
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  };

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Examen Terminé</h2>
          <p className="text-gray-600 mb-6">
            Vos réponses ont été enregistrées avec succès. Vous pouvez maintenant fermer cette fenêtre.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-[#252526]">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-200">Examen HTML</h1>
          {isSaving && <span className="text-xs text-gray-400 flex items-center"><Save className="w-3 h-3 mr-1" /> Sauvegarde...</span>}
        </div>
        <div className="flex items-center space-x-6">
          <div className={`text-xl font-mono ${timeLeft < 300 ? 'text-red-500 font-bold animate-pulse' : 'text-gray-300'}`}>
            {formatTime(timeLeft)}
          </div>
          <button
            onClick={handleFinish}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            Terminer l'examen
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-800 bg-[#252526] flex flex-col">
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Explorateur
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center px-4 py-1.5 bg-[#37373d] text-gray-200 cursor-pointer">
              <FileCode2 className="w-4 h-4 mr-2 text-orange-400" />
              <span className="text-sm">index.html</span>
            </div>
          </div>
        </aside>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800">
          <div className="bg-[#1e1e1e] border-b border-gray-800 flex">
            <div className="px-4 py-2 text-sm bg-[#1e1e1e] border-t-2 border-blue-500 text-white flex items-center">
              <FileCode2 className="w-4 h-4 mr-2 text-orange-400" />
              index.html
            </div>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="html"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: false,
              }}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center text-gray-700 text-sm font-medium">
            <Play className="w-4 h-4 mr-2" />
            Aperçu en direct
          </div>
          <div className="flex-1 overflow-hidden bg-white">
            <iframe
              srcDoc={code}
              title="Preview"
              className="w-full h-full border-none"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
