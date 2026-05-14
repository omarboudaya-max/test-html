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

  const renderHighlightedCode = (code: string, cheatLogs: any[]) => {
    if (!code) return 'Aucun code';
    
    // Échapper le code pour l'affichage (XSS protection)
    let escapedCode = code.replace(/&/g, "&amp;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;")
                          .replace(/"/g, "&quot;")
                          .replace(/'/g, "&#039;");

    const pasteLogs = cheatLogs?.filter((log: any) => log.type === 'paste' && log.pastedText) || [];

    pasteLogs.forEach((log: any) => {
      const escapedPasted = log.pastedText.replace(/&/g, "&amp;")
                                          .replace(/</g, "&lt;")
                                          .replace(/>/g, "&gt;")
                                          .replace(/"/g, "&quot;")
                                          .replace(/'/g, "&#039;");
      if (escapedPasted.trim() !== '') {
        // Remplacer avec la balise de surlignage
        escapedCode = escapedCode.split(escapedPasted).join(`<span class="bg-red-500/40 text-red-200 border-b-2 border-red-500 font-bold px-1 rounded" title="Copier-Coller suspecté">${escapedPasted}</span>`);
      }
    });

    return <code dangerouslySetInnerHTML={{ __html: escapedCode }} />;
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
          <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedSubmission(null)}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl font-bold text-gray-900" id="modal-title">
                      Évaluation de {selectedSubmission.student.first_name} {selectedSubmission.student.last_name}
                    </h3>
                    <button onClick={() => setSelectedSubmission(null)} className="text-gray-400 hover:text-gray-500">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-6 h-[70vh]">
                    <div className="col-span-1 border rounded-lg bg-gray-50 flex flex-col overflow-hidden">
                      <div className="p-3 bg-gray-200 border-b font-semibold text-gray-700">Logs de triche</div>
                      <div className="p-4 overflow-y-auto flex-1">
                        {selectedSubmission.sub?.cheat_logs?.length > 0 ? (
                          <ul className="space-y-3">
                            {selectedSubmission.sub.cheat_logs.map((log: any, idx: number) => (
                              <li key={idx} className="bg-red-50 p-3 rounded-md border border-red-100">
                                <div className="text-sm font-bold text-red-800">{log.type}</div>
                                <div className="text-xs text-red-600 mt-1">{log.details}</div>
                                <div className="text-xs text-gray-500 mt-2">{new Date(log.time).toLocaleTimeString()}</div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-gray-500 text-sm">Aucune anomalie détectée.</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-2 border rounded-lg flex flex-col overflow-hidden">
                      <div className="p-3 bg-gray-200 border-b flex justify-between items-center font-semibold text-gray-700">
                        <span>Aperçu du rendu (HTML)</span>
                      </div>
                      <div className="flex-1 bg-white relative">
                        {selectedSubmission.sub?.html_code ? (
                          <iframe
                            srcDoc={selectedSubmission.sub.html_code}
                            className="absolute inset-0 w-full h-full border-0"
                            title="Preview"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-400">Aucun code soumis</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 border-t pt-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Code Source :</h4>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm max-h-48 whitespace-pre-wrap">
                      {renderHighlightedCode(selectedSubmission.sub?.html_code, selectedSubmission.sub?.cheat_logs)}
                    </pre>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={() => setSelectedSubmission(null)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
