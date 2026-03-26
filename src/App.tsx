/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AssessmentForm from './components/AssessmentForm';
import CaedInfo from './components/CaedInfo';
import History from './components/History';
import { AssessmentData } from './types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function App() {
  const [activeTab, setActiveTab] = useState<'form' | 'info' | 'history'>('form');
  const [history, setHistory] = useState<AssessmentData[]>([]);
  const [dataSource, setDataSource] = useState<'api' | 'local'>('api');
  const apiBase = (import.meta.env.VITE_PUBLIC_API_URL ?? '').replace(/\/$/, '');

  useEffect(() => {
    const loadFromLocal = () => {
      const saved = localStorage.getItem('caed_history');
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse history', e);
        }
      }
    };

    const loadFromApi = async () => {
      const url = apiBase ? `${apiBase}/api/assessments` : '/api/assessments';
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      return (await res.json()) as AssessmentData[];
    };

    (async () => {
      try {
        const items = await loadFromApi();
        setHistory(items);
        setDataSource('api');
      } catch (e) {
        setDataSource('local');
        loadFromLocal();
      }
    })();
  }, []);

  const saveToHistory = async (data: AssessmentData) => {
    if (dataSource === 'local') {
      setHistory((prev) => {
        const next = [data, ...prev];
        localStorage.setItem('caed_history', JSON.stringify(next));
        return next;
      });
      return;
    }

    const url = apiBase ? `${apiBase}/api/assessments` : '/api/assessments';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error('Não foi possível salvar no banco.');
    }

    setHistory((prev) => [data, ...prev]);
  };

  const deleteFromHistory = async (id: string) => {
    if (dataSource === 'local') {
      setHistory((prev) => {
        const next = prev.filter((item) => item.id !== id);
        localStorage.setItem('caed_history', JSON.stringify(next));
        return next;
      });
      return;
    }

    const url = apiBase ? `${apiBase}/api/assessments?id=${encodeURIComponent(id)}` : `/api/assessments/${encodeURIComponent(id)}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error('Não foi possível remover do banco.');
    }

    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const downloadPDF = async (data: AssessmentData) => {
    // Create a temporary element to render the summary for PDF
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.innerHTML = `
      <div style="padding: 40px; font-family: sans-serif; background: white;">
        <h1 style="font-size: 24px; margin-bottom: 20px; color: #0f172a;">Relatório de Avaliação CAED</h1>
        <p><strong>Escola:</strong> ${data.schoolName}</p>
        <p><strong>Data:</strong> ${new Date(data.submittedAt).toLocaleDateString('pt-BR')}</p>
        <p><strong>Total de Alunos:</strong> ${data.classes.reduce((sum, c) => sum + c.studentCount, 0)}</p>
        <p><strong>Toner Reserva:</strong> ${data.hasSpareToner ? 'Sim' : 'Não'}</p>
        <p><strong>Impressora:</strong> ${data.isPrinterGood ? 'Boas condições' : 'Necessita manutenção'}</p>
        <p><strong>Nível do Toner:</strong> ${data.tonerLevel}%</p>
        <h3 style="margin-top: 20px;">Turmas:</h3>
        <ul>
          ${data.classes.map(c => `<li>${c.name}: ${c.studentCount} alunos</li>`).join('')}
        </ul>
      </div>
    `;
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        encryption: {
          userPassword: '360618',
          ownerPassword: '360618',
          userPermissions: ['print']
        }
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`relatorio-${data.schoolName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="py-8">
        {activeTab === 'form' && (
          <AssessmentForm onSuccess={saveToHistory} />
        )}
        {activeTab === 'history' && (
          <History 
            history={history} 
            onDelete={deleteFromHistory} 
            onDownload={downloadPDF}
          />
        )}
        {activeTab === 'info' && (
          <CaedInfo />
        )}
      </main>

      <footer className="py-12 text-center text-slate-400 text-sm">
        <p>© 2026 Gestor de Avaliação CAED. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
