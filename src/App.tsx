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
    const escapeHtml = (value: unknown) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const totalStudents = data.classes.reduce((sum, c) => sum + c.studentCount, 0);
    const submittedAt = new Date(data.submittedAt).toLocaleString('pt-BR');
    const printerTpscNumber = (data.printerTpscNumber ?? '').trim() || '—';
    const printerQuadro = (data.printerQuadro ?? '').trim() || '—';

    const classesRows = data.classes
      .map(
        (c) => `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(c.name)}</td>
            <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${Number(c.studentCount) || 0}</td>
          </tr>
        `,
      )
      .join('');

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.innerHTML = `
      <div style="padding: 36px; font-family: Arial, sans-serif; background: white; color: #0f172a;">
        <div style="display:flex; justify-content:space-between; gap: 16px; align-items:flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.2px;">Relatório CAED</div>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">Formulário de infraestrutura e aplicação</div>
          </div>
          <div style="font-size: 12px; color: #475569; text-align: right; line-height: 1.4;">
            <div><span style="font-weight: 700; color:#0f172a;">Enviado em:</span> ${escapeHtml(submittedAt)}</div>
            <div><span style="font-weight: 700; color:#0f172a;">ID:</span> ${escapeHtml(data.id)}</div>
          </div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 16px; margin-bottom: 14px; background: #f8fafc;">
          <div style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">Escola</div>
          <div style="font-size: 18px; font-weight: 800; margin-top: 6px;">${escapeHtml(data.schoolName)}</div>
        </div>

        <div style="display:flex; gap: 12px; margin-bottom: 12px;">
          <div style="flex:1; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px;">
            <div style="font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Turmas</div>
            <div style="font-size: 18px; font-weight: 800; margin-top: 6px;">${data.classes.length}</div>
          </div>
          <div style="flex:1; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px;">
            <div style="font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Alunos</div>
            <div style="font-size: 18px; font-weight: 800; margin-top: 6px;">${totalStudents}</div>
          </div>
          <div style="flex:1; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px;">
            <div style="font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Toner</div>
            <div style="font-size: 18px; font-weight: 800; margin-top: 6px;">${Number(data.tonerLevel) || 0}%</div>
          </div>
        </div>

        <div style="display:flex; gap: 12px; margin-bottom: 14px;">
          <div style="flex:1; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px;">
            <div style="font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Toner Reserva</div>
            <div style="font-size: 16px; font-weight: 800; margin-top: 6px;">${data.hasSpareToner ? 'Sim' : 'Não'}</div>
          </div>
          <div style="flex:1; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px;">
            <div style="font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Impressora</div>
            <div style="font-size: 16px; font-weight: 800; margin-top: 6px;">${data.isPrinterGood ? 'Sim' : 'Não'}</div>
          </div>
          <div style="flex:1; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px;">
            <div style="font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Número TPSC</div>
            <div style="font-size: 16px; font-weight: 800; margin-top: 6px;">${escapeHtml(printerTpscNumber)}</div>
          </div>
        </div>

        <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Quadro</div>
          <div style="font-size: 16px; font-weight: 800; margin-top: 6px;">${escapeHtml(printerQuadro)}</div>
        </div>

        <div style="font-size: 14px; font-weight: 800; margin-bottom: 10px;">Turmas e alunos que farão a prova</div>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
          <thead>
            <tr style="background: #0f172a; color: white;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Turma</th>
              <th style="padding: 10px 12px; text-align: right; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Alunos</th>
            </tr>
          </thead>
          <tbody>
            ${classesRows}
            <tr>
              <td style="padding: 10px 12px; font-weight: 800;">Total</td>
              <td style="padding: 10px 12px; font-weight: 800; text-align: right;">${totalStudents}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    document.body.appendChild(tempDiv);

    try {
      const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: '#ffffff' });
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
