import React from 'react';
import { BookOpen, Info, CheckCircle } from 'lucide-react';

export default function CaedInfo() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <header className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Sobre o CAED</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          O Centro de Políticas Públicas e Avaliação da Educação (CAEd) é referência nacional em avaliação educacional e gestão da informação.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <BookOpen size={24} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">O que é a Avaliação?</h2>
          <p className="text-slate-600 leading-relaxed">
            As avaliações do CAEd buscam diagnosticar o nível de aprendizagem dos estudantes, fornecendo subsídios para a elaboração de políticas públicas e intervenções pedagógicas mais eficazes.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
            <CheckCircle size={24} />
          </div>
          <h2 className="text-xl font-semibold text-slate-800">Importância do Gestor</h2>
          <p className="text-slate-600 leading-relaxed">
            É importante que seja respondido o formulário para que o NTE possa agilizar o processo de solicitação de insumos.
          </p>
        </div>
      </div>

      <section className="bg-slate-900 text-white p-8 rounded-3xl space-y-6">
        <div className="flex items-center gap-3">
          <Info className="text-blue-400" />
          <h2 className="text-2xl font-bold">Orientações de Impressão</h2>
        </div>
        <ul className="grid md:grid-cols-2 gap-4 text-slate-300">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 shrink-0"></span>
            Não deixe para imprimir tudo de uma vez.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 shrink-0"></span>
            Separe em lotes para que a impressora não se sobrecarregue.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 shrink-0"></span>
            Anote a quantidade aproximada de cópias impressas para a prova.
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 shrink-0"></span>
            Anote as impressões que deram errado.
          </li>
        </ul>
      </section>
    </div>
  );
}
