'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    class_name: '',
    email: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Check if email already exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id, test_status')
        .eq('email', formData.email)
        .single();

      if (existingStudent) {
        if (existingStudent.test_status === 'completed') {
          throw new Error('Vous avez déjà terminé cet examen.');
        }
        // Redirect to their existing exam
        router.push(`/exam/${existingStudent.id}`);
        return;
      }

      // 2. Insert new student
      const { data, error: insertError } = await supabase
        .from('students')
        .insert([{ ...formData, test_status: 'in_progress' }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Create initial submission row
      const { error: subError } = await supabase
        .from('submissions')
        .insert([{ student_id: data.id, html_code: '<!-- Tapez votre code HTML ici -->\n<h1>Bonjour le monde!</h1>' }]);

      if (subError) throw subError;

      router.push(`/exam/${data.id}`);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Examen de Codage HTML
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Veuillez vous inscrire pour commencer l'examen
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                Prénom
              </label>
              <div className="mt-1">
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                />
              </div>
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Nom
              </label>
              <div className="mt-1">
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                />
              </div>
            </div>

            <div>
              <label htmlFor="class_name" className="block text-sm font-medium text-gray-700">
                Classe
              </label>
              <div className="mt-1">
                <input
                  id="class_name"
                  name="class_name"
                  type="text"
                  required
                  value={formData.class_name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="mail@ihec.ucar.tn"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Chargement...' : 'Commencer l\'examen'}
              </button>
            </div>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Je suis un admin
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
