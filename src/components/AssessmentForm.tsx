import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileText, Printer, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ClassInfo, AssessmentData } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface AssessmentFormProps {
  onSuccess: (data: AssessmentData) => void | Promise<void>;
}

export default function AssessmentForm({ onSuccess }: AssessmentFormProps) {
  const [schoolName, setSchoolName] = useState('');
  const [classes, setClasses] = useState<ClassInfo[]>([{ id: crypto.randomUUID(), name: '', studentCount: 0 }]);
  const [hasSpareToner, setHasSpareToner] = useState<boolean | null>(null);
  const [isPrinterGood, setIsPrinterGood] = useState<boolean | null>(null);
  const [printerTpscNumber, setPrinterTpscNumber] = useState('');
  const [printerQuadro, setPrinterQuadro] = useState('');
  const [tonerLevel, setTonerLevel] = useState(50);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [lastSubmittedData, setLastSubmittedData] = useState<AssessmentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch (e) {
      return Math.random().toString(36).substring(2, 15);
    }
  };

  const totalStudents = classes.reduce((sum, c) => sum + (Number(c.studentCount) || 0), 0);

  const addClass = () => {
    setClasses([...classes, { id: generateId(), name: '', studentCount: 0 }]);
  };

  const removeClass = (id: string) => {
    if (classes.length > 1) {
      setClasses(classes.filter(c => c.id !== id));
    }
  };

  const updateClass = (id: string, field: keyof ClassInfo, value: string | number) => {
    const val = field === 'studentCount' ? (parseInt(value as string) || 0) : value;
    setClasses(classes.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!schoolName.trim()) {
      setError('O nome da escola é obrigatório.');
      return;
    }
    if (hasSpareToner === null) {
      setError('Informe se a escola tem toner reserva.');
      return;
    }
    if (isPrinterGood === null) {
      setError('Informe as condições da impressora.');
      return;
    }
    if (!printerTpscNumber.trim()) {
      setError('Informe o Número TPSC.');
      return;
    }
    if (!printerQuadro.trim()) {
      setError('Informe o Quadro.');
      return;
    }

    const data: AssessmentData = {
      id: generateId(),
      schoolName,
      classes,
      hasSpareToner,
      isPrinterGood,
      printerTpscNumber,
      printerQuadro,
      tonerLevel,
      submittedAt: new Date().toISOString()
    };

    try {
      await onSuccess(data);
      setLastSubmittedData(data);
      setIsSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError((err as Error).message ?? 'Não foi possível salvar o relatório.');
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('assessment-summary');
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
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
    pdf.save(`relatorio-caed-${schoolName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  if (isSubmitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto p-8 bg-white rounded-3xl shadow-xl border border-slate-100 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Formulário Enviado!</h2>
        <p className="text-slate-600">
          Obrigado, gestor. Seus dados foram registrados com sucesso.
        </p>
        
        <div id="assessment-summary" className="p-6 bg-slate-50 rounded-2xl text-left space-y-4 border border-slate-200">
          <h3 className="font-bold text-xl border-bottom border-slate-300 pb-2">Resumo do Relatório</h3>
          <p><strong>Escola:</strong> {lastSubmittedData?.schoolName}</p>
          <p><strong>Total de Alunos:</strong> {lastSubmittedData?.classes.reduce((sum, c) => sum + c.studentCount, 0)}</p>
          <p><strong>Toner Reserva:</strong> {lastSubmittedData?.hasSpareToner ? 'Sim' : 'Não'}</p>
          <p><strong>Impressora:</strong> {lastSubmittedData?.isPrinterGood ? 'Boas condições' : 'Necessita manutenção'}</p>
          <p><strong>Número TPSC:</strong> {lastSubmittedData?.printerTpscNumber}</p>
          <p><strong>Quadro:</strong> {lastSubmittedData?.printerQuadro}</p>
          <p><strong>Nível do Toner:</strong> {lastSubmittedData?.tonerLevel}%</p>
          <div className="mt-4">
            <p className="font-semibold mb-2">Turmas e alunos que farão a prova:</p>
            <ul className="list-disc pl-5 space-y-1">
              {lastSubmittedData?.classes.map(c => (
                <li key={c.id}>{c.name}: {c.studentCount} alunos</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button
            onClick={generatePDF}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
          >
            <Printer size={20} />
            Salvar em PDF
          </button>
          <button
            onClick={() => setIsSubmitted(false)}
            className="text-slate-600 hover:text-slate-900 font-medium"
          >
            Voltar ao formulário
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Nome da Escola</label>
          <input
            type="text"
            required
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="w-full text-2xl font-bold border-b-2 border-slate-200 focus:border-blue-500 outline-none py-2 transition-colors"
            placeholder="Digite o nome da escola..."
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Turmas e alunos que farão a prova</label>
            <button
              type="button"
              onClick={addClass}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              <Plus size={16} />
              Adicionar Turma
            </button>
          </div>
          
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {classes.map((c, index) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex gap-3 items-center"
                >
                  <input
                    type="text"
                    required
                    placeholder="Ex: 5º Ano A"
                    value={c.name}
                    onChange={(e) => updateClass(c.id, 'name', e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <input
                    type="number"
                    required
                    placeholder="Qtd Alunos"
                    value={c.studentCount || ''}
                    onChange={(e) => updateClass(c.id, 'studentCount', parseInt(e.target.value))}
                    className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeClass(c.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl flex justify-between items-center">
            <span className="font-semibold text-blue-900">Total de Alunos:</span>
            <span className="text-2xl font-bold text-blue-600">{totalStudents}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">Toner Reserva?</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setHasSpareToner(true)}
                className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${
                  hasSpareToner === true ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-200'
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setHasSpareToner(false)}
                className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${
                  hasSpareToner === false ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-200'
                }`}
              >
                Não
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider block">Impressora em boas condições?</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIsPrinterGood(true)}
                className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${
                  isPrinterGood === true ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-200'
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setIsPrinterGood(false)}
                className={`flex-1 py-3 rounded-xl font-semibold border-2 transition-all ${
                  isPrinterGood === false ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:border-blue-200'
                }`}
              >
                Não
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Número TPSC</label>
                <input
                  type="text"
                  required
                  value={printerTpscNumber}
                  onChange={(e) => setPrinterTpscNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 12345"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Quadro</label>
                <input
                  type="text"
                  required
                  value={printerQuadro}
                  onChange={(e) => setPrinterQuadro(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: A"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Nível aproximado do Toner</label>
            <span className="font-bold text-blue-600">{tonerLevel}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={tonerLevel}
            onChange={(e) => setTonerLevel(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>VAZIO</span>
            <span>CHEIO</span>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium"
          >
            {error}
          </motion.div>
        )}

        <button
          type="submit"
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
        >
          <Save size={20} />
          Concluir e Enviar
        </button>
      </form>
    </div>
  );
}
