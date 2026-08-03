// src/controllers/report.controller.js
const PDFDocument = require('pdfkit');
const reportModel = require('../models/report.model');
const companyModel = require('../models/company.model');

const DAY_LABELS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDuration(totalSeconds) {
  if (totalSeconds === null || Number.isNaN(totalSeconds)) return null;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}m ${seconds}s`;
}

// Consolida todas as métricas do período — reaproveitado por overview()
// (JSON, para o Dashboard/Relatórios) e pelos exports em CSV/PDF, para
// não duplicar a lógica de agregação em três lugares.
async function buildOverview(companyId) {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    messagesSent,
    customersServed,
    avgResponseSeconds,
    chartRows,
    conversationCounts,
    employeesOnline,
    aiUsage,
  ] = await Promise.all([
    reportModel.countMessagesSent(companyId, since7d),
    reportModel.countCustomersServed(companyId, since7d),
    reportModel.averageResponseTimeSeconds(companyId, since7d),
    reportModel.messagesByDay(companyId, 7),
    reportModel.countConversationsByStatus(companyId),
    reportModel.countEmployeesOnline(companyId),
    reportModel.aiUsage(companyId, since7d),
  ]);

  const chartData = chartRows.map((row) => {
    const date = new Date(row.day);
    return { dia: DAY_LABELS_PT[date.getDay()], data: row.day, mensagens: row.count };
  });

  return {
    messagesSent,
    customersServed,
    avgResponseTime: formatDuration(avgResponseSeconds) ?? 'Sem dados',
    employeesOnline,
    conversationsOpen: conversationCounts.open,
    conversationsClosed: conversationCounts.closed,
    aiUsage,
    chartData,
  };
}

// GET /api/reports/overview
async function overview(req, res, next) {
  try {
    const data = await buildOverview(req.user.companyId);
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/export.csv
// CSV simples (sem lib externa — é só texto delimitado por vírgula),
// pronto para abrir no Excel/Sheets.
async function exportCsv(req, res, next) {
  try {
    const data = await buildOverview(req.user.companyId);

    const lines = [
      'Métrica,Valor',
      `Mensagens enviadas (7 dias),${data.messagesSent}`,
      `Clientes atendidos (7 dias),${data.customersServed}`,
      `Tempo médio de resposta,${data.avgResponseTime}`,
      `Funcionários online,${data.employeesOnline}`,
      `Conversas em aberto,${data.conversationsOpen}`,
      `Conversas encerradas,${data.conversationsClosed}`,
      `Respostas do bot geradas por IA (7 dias),${data.aiUsage.aiPercentage}%`,
      '',
      'Mensagens por dia',
      'Data,Dia da semana,Mensagens',
      ...data.chartData.map((row) => `${row.data.toISOString().slice(0, 10)},${row.dia},${row.mensagens}`),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-autoflux.csv"');
    // BOM UTF-8 no início: sem isso, o Excel no Windows abre acentos
    // corrompidos em arquivos CSV que não começam com esse marcador.
    return res.send('\uFEFF' + lines.join('\n'));
  } catch (err) {
    next(err);
  }
}

// GET /api/reports/export.pdf
// PDF gerado com pdfkit direto no response stream (sem arquivo
// temporário em disco).
async function exportPdf(req, res, next) {
  try {
    const [data, company] = await Promise.all([
      buildOverview(req.user.companyId),
      companyModel.findById(req.user.companyId),
    ]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-autoflux.pdf"');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text(`Relatório de atendimento — ${company?.name || ''}`, { align: 'left' });
    doc.fontSize(10).fillColor('#666').text(`Gerado em ${new Date().toLocaleString('pt-BR')} · últimos 7 dias`);
    doc.moveDown(1.5);

    const rows = [
      ['Mensagens enviadas (7 dias)', String(data.messagesSent)],
      ['Clientes atendidos (7 dias)', String(data.customersServed)],
      ['Tempo médio de resposta', data.avgResponseTime],
      ['Funcionários online', String(data.employeesOnline)],
      ['Conversas em aberto', String(data.conversationsOpen)],
      ['Conversas encerradas', String(data.conversationsClosed)],
      ['Respostas do bot geradas por IA', `${data.aiUsage.aiPercentage}%`],
    ];

    doc.fillColor('#000').fontSize(12);
    for (const [label, value] of rows) {
      doc.font('Helvetica-Bold').text(label, { continued: true, width: 300 });
      doc.font('Helvetica').text(`  ${value}`);
    }

    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(13).text('Mensagens por dia');
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11);
    for (const row of data.chartData) {
      doc.text(`${row.data.toISOString().slice(0, 10)} (${row.dia}): ${row.mensagens} mensagens`);
    }

    doc.end();
  } catch (err) {
    next(err);
  }
}

module.exports = { overview, exportCsv, exportPdf };
