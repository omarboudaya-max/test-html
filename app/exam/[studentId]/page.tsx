'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import { supabase } from '@/lib/supabase';
import { FileCode2, Play, Save, CheckCircle, Plus, Download, Info } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function ExamPage({ params }: { params: Promise<{ studentId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const studentId = resolvedParams.studentId;
  
  const [files, setFiles] = useState([
    { name: 'index.html', language: 'html', content: '<!-- Tapez votre code HTML ici -->\n<h1>Bonjour le monde!</h1>' },
    { name: 'style.css', language: 'css', content: '/* Tapez votre code CSS ici */\nbody {\n  font-family: sans-serif;\n}' }
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes in seconds
  const [isFinished, setIsFinished] = useState(false);
  const [cheatLogs, setCheatLogs] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
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
        if (data.html_code) {
          try {
            const parsed = JSON.parse(data.html_code);
            if (Array.isArray(parsed)) setFiles(parsed);
            else setFiles([{ name: 'index.html', language: 'html', content: data.html_code }]);
          } catch {
            setFiles([{ name: 'index.html', language: 'html', content: data.html_code }]);
          }
        }
        if (data.cheat_logs) setCheatLogs(data.cheat_logs);
      }
    };
    loadSubmission();
  }, [studentId]);

  // Anti-Cheat System
  useEffect(() => {
    if (isFinished) return;

    const logCheat = async (type: string, details: string, pastedText?: string) => {
      const newLog = { type, details, time: new Date().toISOString(), pastedText };
      const updatedLogs = [...cheatLogs, newLog];
      setCheatLogs(updatedLogs);

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
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && pastedText.trim().length > 0) {
        logCheat('paste', "Un copier-coller a été détecté et enregistré.", pastedText);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    // Le "true" est CRUCIAL ici (phase de capture) pour intercepter le collage AVANT l'éditeur Monaco
    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('paste', handlePaste, true);
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
  }, [files, isFinished]);

  const saveCode = async () => {
    setIsSaving(true);
    await supabase.from('submissions')
      .update({ html_code: JSON.stringify(files), time_spent_seconds: 45 * 60 - timeLeft })
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
  
  const handleExport = () => {
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.name, file.content);
    });
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, `examen_${studentId}.zip`);
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEditorChange = (value: string | undefined) => {
    const newFiles = [...files];
    newFiles[activeFileIndex].content = value || '';
    setFiles(newFiles);
  };

  const handleAddFile = () => {
    const fileName = prompt('Nom du fichier (ex: script.js) :');
    if (fileName) {
      const language = fileName.endsWith('.css') ? 'css' : fileName.endsWith('.js') ? 'javascript' : 'html';
      setFiles([...files, { name: fileName, language, content: '' }]);
      setActiveFileIndex(files.length);
    }
  };

  const combinedCode = `
    <html>
      <head>
        <style>${files.filter(f => f.name.endsWith('.css')).map(f => f.content).join('\n')}</style>
      </head>
      <body>
        ${files.filter(f => f.name.endsWith('.html')).map(f => f.content).join('\n')}
      </body>
    </html>
  `;

  if (isFinished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full flex flex-col gap-4">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
          <h2 className="text-2xl font-bold text-gray-900">Examen Terminé</h2>
          <p className="text-gray-600">
            Vos réponses ont été enregistrées avec succès.
          </p>
          <button
            onClick={handleExport}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" /> Exporter mon projet (.zip)
          </button>
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

  const activeFile = files[activeFileIndex];

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-[#252526]">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-200">Examen Web</h1>
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
          <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider flex justify-between items-center">
            Explorateur
            <button onClick={handleAddFile} className="hover:text-white" title="Nouveau fichier">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {files.map((file, index) => (
              <div 
                key={index}
                onClick={() => setActiveFileIndex(index)}
                className={`flex items-center px-4 py-1.5 cursor-pointer text-sm ${activeFileIndex === index ? 'bg-[#37373d] text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-[#2a2d2e]'}`}
              >
                <FileCode2 className={`w-4 h-4 mr-2 ${file.language === 'html' ? 'text-orange-400' : file.language === 'css' ? 'text-blue-400' : 'text-yellow-400'}`} />
                {file.name}
              </div>
            ))}
          </div>
        </aside>

        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800">
          <div className="bg-[#1e1e1e] border-b border-gray-800 flex overflow-x-auto">
            {files.map((file, index) => (
              <div 
                key={index}
                onClick={() => setActiveFileIndex(index)}
                className={`px-4 py-2 text-sm flex items-center cursor-pointer min-w-max ${activeFileIndex === index ? 'bg-[#1e1e1e] border-t-2 border-blue-500 text-white' : 'bg-[#2d2d2d] text-gray-400 border-t-2 border-transparent hover:bg-[#2b2b2b]'}`}
              >
                <FileCode2 className={`w-4 h-4 mr-2 ${file.language === 'html' ? 'text-orange-400' : file.language === 'css' ? 'text-blue-400' : 'text-yellow-400'}`} />
                {file.name}
              </div>
            ))}
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language={activeFile.language}
              theme="vs-dark"
              value={activeFile.content}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                formatOnPaste: false,
              }}
            />
          </div>
        </div>

        {/* Right Panel: Preview & Instructions */}
        <div className="flex-1 flex flex-col bg-gray-100 min-w-[300px]">
          {/* Instructions */}
          <div className="h-1/3 bg-white border-b border-gray-300 flex flex-col">
            <div className="bg-gray-200 px-4 py-2 flex items-center text-gray-800 text-sm font-semibold">
              <Info className="w-4 h-4 mr-2" />
              Instructions de l'exercice
            </div>
            <div className="flex-1 p-4 overflow-y-auto text-gray-800 text-sm max-w-none">
              <p className="font-bold mb-2">Consignes :</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Lisez attentivement le sujet distribué par votre professeur.</li>
                <li>Utilisez l'explorateur pour naviguer entre <code>index.html</code> et <code>style.css</code>.</li>
                <li>Vous pouvez ajouter de nouveaux fichiers (comme un autre fichier css) avec le bouton <strong>+</strong>.</li>
                <li>Votre travail est sauvegardé automatiquement. N'oubliez pas de cliquer sur "Terminer l'examen" à la fin.</li>
              </ul>
            </div>
          </div>
          
          {/* Preview */}
          <div className="flex-1 flex flex-col bg-white">
            <div className="bg-gray-200 border-b border-gray-300 px-4 py-2 flex items-center text-gray-800 text-sm font-semibold">
              <Play className="w-4 h-4 mr-2" />
              Aperçu en direct
            </div>
            <div className="flex-1 overflow-hidden bg-white relative">
              <iframe
                srcDoc={combinedCode}
                title="Preview"
                className="w-full h-full border-none absolute inset-0 bg-white"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
