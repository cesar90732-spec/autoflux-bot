// src/services/pix.service.js
// Gera cobranças Pix "estáticas" (Copia e Cola + QR Code) usando só a
// chave Pix da conta pessoal — sem token, sem API de terceiro, sem
// cadastro de empresa. É o mesmo padrão (BR Code / EMV) que qualquer
// banco ou carteira usa; funciona com PicPay, Nubank, Caixa, etc.
//
// Trade-off consciente: como não é uma API de gateway, não existe
// webhook de confirmação automática. A confirmação de pagamento é
// manual (o admin da plataforma confirma no painel depois de ver o
// Pix cair na conta) — ver billing.controller.confirmPayment.

const QRCode = require('qrcode');

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// TLV = Tag-Length-Value, o formato usado em todo o payload EMV do Pix.
function tlv(id, value) {
  const length = String(value.length).padStart(2, '0');
  return `${id}${length}${value}`;
}

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// key: chave Pix (CPF, e-mail, telefone ou chave aleatória)
// name: nome do recebedor (máx 25 caracteres, sem acento)
// city: cidade do recebedor (máx 15 caracteres, sem acento)
// amount: valor em reais (ex: 49.00)
// txid: identificador único da cobrança, só letras/números, até 25 caracteres
function buildPixPayload({ key, name, city, amount, txid }) {
  const merchantName = removeAccents(name).toUpperCase().slice(0, 25);
  const merchantCity = removeAccents(city).toUpperCase().slice(0, 15);
  const cleanTxid = txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || 'AUTOFLUX';

  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
  const additionalData = tlv('05', cleanTxid);

  let payload =
    tlv('00', '01') + // Payload Format Indicator
    tlv('01', '11') + // Point of Initiation Method (11 = estático, reutilizável)
    tlv('26', merchantAccountInfo) + // Merchant Account Information (Pix)
    tlv('52', '0000') + // Merchant Category Code (genérico)
    tlv('53', '986') + // Transaction Currency (986 = BRL)
    tlv('54', amount.toFixed(2)) + // Transaction Amount
    tlv('58', 'BR') + // Country Code
    tlv('59', merchantName) + // Merchant Name
    tlv('60', merchantCity) + // Merchant City
    tlv('62', additionalData); // Additional Data Field (txid)

  payload += '6304'; // Tag + length do CRC16 (o valor em si vem depois)
  const checksum = crc16(payload);

  return payload + checksum;
}

async function generateCharge({ amount, txid, description }) {
  const key = process.env.PIX_KEY;
  const name = process.env.PIX_OWNER_NAME;
  const city = process.env.PIX_OWNER_CITY;

  if (!key || !name || !city) {
    const err = new Error(
      'PIX_KEY, PIX_OWNER_NAME e PIX_OWNER_CITY precisam estar configurados no .env do servidor.'
    );
    err.statusCode = 500;
    throw err;
  }

  const payload = buildPixPayload({ key, name, city, amount, txid });
  const qrCodeBase64 = await QRCode.toDataURL(payload);

  return { copyPasteCode: payload, qrCodeBase64, description };
}

module.exports = { buildPixPayload, generateCharge };
