'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, CheckCircle, Clock, Eye, X } from 'lucide-react';

export default function AdminDashboard() {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail.toLowerCase() === 'omarboudaya1@gmail.com' && adminPassword === 'admin123') {
      setIsAdminAuthenticated(true);
      fetchStudents();
    } else {
      setLoginError('Accès refusé. Email ou mot de passe incorrect.');
    }
  };

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        submissions (
          html_code,
          time_spent_seconds,
          cheat_logs
        )
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setStudents(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchStudents();
      const interval = setInterval(fetchStudents, 10000);
      return () => clearInterval(interval);
    }
  }, [isAdminAuthenticated]);

  const formatTime = (seconds: number) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1"/> Terminé</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1"/> En cours</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">En attente</span>;
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-900">Accès Administrateur</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Admin</label>
              <input
                type="email"
                id="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                required
                placeholder="Entrez l'email administrateur"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <input
                type="password"
                id="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                required
                placeholder="Entrez le mot de passe"
              />
            </div>
            {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
            >
              Se connecter
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderHighlightedCode = (codeString: string, cheatLogs: any[]) => {
    if (!codeString) return 'Aucun code';

    let files = [];
    try {
      const parsed = JSON.parse(codeString);
      if (Array.isArray(parsed)) {
        files = parsed;
      } else {
        files = [{ name: 'index.html', content: codeString }];
      }
    } catch {
      files = [{ name: 'index.html', content: codeString }];
    }

    const pasteLogs = cheatLogs?.filter((log: any) => log.type === 'paste' && log.pastedText) || [];

    return files.map((file, idx) => {
      let escapedCode = file.content.replace(/&/g, "&amp;")
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/"/g, "&quot;")
                            .replace(/'/g, "&#039;");

      pasteLogs.forEach((log: any) => {
        // Monaco Editor convertit les sauts de ligne Windows (\r\n) en \n.
        // Il faut donc normaliser le texte collé pour que la comparaison (split) fonctionne.
        const normalizedPasted = (log.pastedText || '').replace(/\r\n/g, '\n');
        
        const escapedPasted = normalizedPasted.replace(/&/g, "&amp;")
                                              .replace(/</g, "&lt;")
                                              .replace(/>/g, "&gt;")
                                              .replace(/"/g, "&quot;")
                                              .replace(/'/g, "&#039;");
                                              
        if (escapedPasted.trim() !== '') {
          escapedCode = escapedCode.split(escapedPasted).join(`<span class="bg-red-500/60 text-white border border-red-400 px-1 rounded-md" title="Copier-Coller suspecté">${escapedPasted}</span>`);
        }
      });

      return (
        <div key={idx} className="mb-6">
          <div className="text-gray-400 font-bold mb-2 border-b border-gray-700 pb-1">{file.name}</div>
          <code dangerouslySetInnerHTML={{ __html: escapedCode }} className="block" />
        </div>
      );
    });
  };

  const getCombinedPreview = (codeString: string) => {
    if (!codeString) return '';
    try {
      const parsed = JSON.parse(codeString);
      if (Array.isArray(parsed)) {
        let htmlCode = parsed.find((f: any) => f.name.endsWith('.html'))?.content || '';
        
        // Remplacement uniquement si la balise <link> est présente
        htmlCode = htmlCode.replace(/<link[^>]*href=["']([^"']*\.css)["'][^>]*>/gi, (match, href) => {
          const cleanHref = href.replace(/^(\.\/|\/)/, '');
          const cssFile = parsed.find((f: any) => f.name === cleanHref);
          if (cssFile) {
            return `<style>${cssFile.content}</style>`;
          }
          return match;
        });

        // Même chose pour les scripts JS
        htmlCode = htmlCode.replace(/<script[^>]*src=["']([^"']*\.js)["'][^>]*><\/script>/gi, (match, src) => {
          const cleanSrc = src.replace(/^(\.\/|\/)/, '');
          const jsFile = parsed.find((f: any) => f.name === cleanSrc);
          if (jsFile) {
            return `<script>${jsFile.content}</script>`;
          }
          return match;
        });

        return htmlCode;
      }
      return codeString;
    } catch {
      return codeString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Professeur</h1>
          <button 
            onClick={fetchStudents}
            className="bg-white text-gray-700 px-4 py-2 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm font-medium"
          >
            Actualiser
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement des données...</div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Étudiant</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classe</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Triche</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => {
                  const sub = student.submissions?.[0];
                  const cheatLogs = sub?.cheat_logs || [];
                  
                  return (
                    <tr key={student.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{student.first_name} {student.last_name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.class_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(student.test_status)}
                        {sub?.time_spent_seconds > 0 && (
                          <div className="text-xs text-gray-500 mt-1">Temps: {formatTime(sub.time_spent_seconds)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.is_cheater || cheatLogs.length > 0 ? (
                          <div className="flex items-center text-red-600">
                            <AlertTriangle className="w-5 h-5 mr-1" />
                            <span className="text-sm font-medium">{cheatLogs.length} alertes</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">Aucune</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedSubmission({ student, sub })}
                          className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal for Submission Detail */}
        {selectedSubmission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-75 p-4 sm:p-6" onClick={() => setSelectedSubmission(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="text-xl font-bold text-gray-900">
                  Évaluation de {selectedSubmission.student.first_name} {selectedSubmission.student.last_name}
                </h3>
                <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  
                  {/* Gauche: Code et Logs */}
                  <div className="flex flex-col gap-6">
                    {/* Logs */}
                    <div className="bg-white rounded-lg shadow border border-gray-200 shrink-0">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 rounded-t-lg">
                        Logs de triche
                      </div>
                      <div className="p-4 max-h-48 overflow-y-auto">
                        {selectedSubmission.sub?.cheat_logs?.length > 0 ? (
                          <ul className="space-y-2">
                            {selectedSubmission.sub.cheat_logs.map((log: any, idx: number) => (
                              <li key={idx} className="bg-red-50 p-3 rounded-md border border-red-100">
                                <div className="text-sm font-bold text-red-800">{log.type}</div>
                                <div className="text-xs text-red-600">{log.details}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">Aucune triche détectée.</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Source Code */}
                    <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[400px]">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 rounded-t-lg shrink-0">
                        Code Source
                      </div>
                      <div className="p-0 bg-gray-900 overflow-y-auto flex-1 rounded-b-lg">
                        <pre className="text-gray-100 text-sm p-4 whitespace-pre-wrap">
                          {renderHighlightedCode(selectedSubmission.sub?.html_code, selectedSubmission.sub?.cheat_logs)}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  {/* Droite: Preview */}
                  <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[500px] lg:h-auto">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 rounded-t-lg shrink-0">
                      Aperçu (Rendu HTML)
                    </div>
                    <div className="flex-1 bg-white relative rounded-b-lg overflow-hidden">
                      {selectedSubmission.sub?.html_code ? (
                        <iframe
                          srcDoc={getCombinedPreview(selectedSubmission.sub.html_code)}
                          className="absolute inset-0 w-full h-full border-0"
                          title="Preview"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">Aucun code</div>
                      )}
                    </div>
                  </div>
                  
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 font-medium text-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
