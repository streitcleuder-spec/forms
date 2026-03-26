import React from 'react';
import { FileText, Download, Trash2, Calendar } from 'lucide-react';
import { AssessmentData } from '../types';

interface HistoryProps {
  history: AssessmentData[];
  onDelete: (id: string) => void;
  onDownload: (assessment: AssessmentData) => void;
}

export default function History({ history, onDelete, onDownload }: HistoryProps) {
  if (history.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
          <FileText size={32} />
        </div>
        <h3 className="text-xl font-semibold text-slate-900">Nenhum relatório salvo</h3>
        <p className="text-slate-500">Os relatórios que você concluir aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-slate-900 px-2">Histórico de Relatórios</h2>
      <div className="grid gap-4">
        {history.map((item) => (
          <div 
            key={item.id}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
          >
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-slate-900">{item.schoolName}</h3>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(item.submittedAt).toLocaleDateString('pt-BR')}
                </span>
                <span>{item.classes.length} turmas</span>
                <span>{item.classes.reduce((sum, c) => sum + c.studentCount, 0)} alunos</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDownload(item)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 px-4"
              >
                <Download size={18} />
                <span className="text-sm font-semibold">PDF</span>
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
