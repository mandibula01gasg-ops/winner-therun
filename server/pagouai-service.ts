import axios from "axios";

interface CreatePixPaymentParams {
  amount: number;
  customerName: string;
  customerEmail: string;
  customerDocument: string;
  customerPhone: string;
  description: string;
  orderId: string;
}

interface PixPaymentResponse {
  success: boolean;
  txid?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  pixCopiaECola?: string;
  expiresAt?: string;
  error?: string;
}

export class PagouAiService {
  private apiKey: string | undefined;
  private baseUrl: string = "https://api.pagou.ai/v1";
  private isConfigured: boolean;

  constructor() {
    this.apiKey = process.env.PAGOUAI_API_KEY;
    
    if (!this.apiKey) {
      console.warn("⚠️ PAGOUAI_API_KEY não configurada. Pagamentos PIX via Pagou.ai não estarão disponíveis.");
      this.isConfigured = false;
      return;
    }

    this.isConfigured = true;
    console.log("✅ Pagou.ai configurado com sucesso");
  }

  async createPixPayment(params: CreatePixPaymentParams): Promise<PixPaymentResponse> {
    if (!this.isConfigured || !this.apiKey) {
      return {
        success: false,
        error: "Pagou.ai não está configurado. Configure PAGOUAI_API_KEY.",
      };
    }

    try {
      const cleanDocument = params.customerDocument.replace(/\D/g, '');

      const payload = {
        calendario: {
          expiracao: 900,
        },
        devedor: {
          cpf: cleanDocument,
          nome: params.customerName,
        },
        valor: {
          original: params.amount.toFixed(2),
        },
        solicitacaoPagador: params.description,
        infoAdicionais: [
          {
            nome: "Pedido",
            valor: params.orderId,
          },
        ],
      };

      console.log("🔄 Criando cobrança PIX na Pagou.ai...");
      
      const response = await axios.post(
        `${this.baseUrl}/pix/cobranca`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.data) {
        throw new Error("Resposta inválida da Pagou.ai");
      }

      console.log("✅ Cobrança PIX criada com sucesso!");

      return {
        success: true,
        txid: response.data.txid,
        pixCopiaECola: response.data.pixCopiaECola,
        qrCodeBase64: response.data.qrCode,
        qrCode: response.data.pixCopiaECola,
        expiresAt: response.data.calendario?.criacao,
      };
    } catch (error: any) {
      console.error("❌ Erro ao criar cobrança PIX na Pagou.ai:", error);
      
      let errorMessage = "Erro ao criar pagamento PIX";
      
      if (error.response?.data) {
        console.error("Detalhes do erro:", error.response.data);
        errorMessage = JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async checkPaymentStatus(txid: string): Promise<any> {
    if (!this.isConfigured || !this.apiKey) {
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/pix/cobranca/${txid}`,
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao consultar status do pagamento:", error);
      return null;
    }
  }

  isAvailable(): boolean {
    return this.isConfigured;
  }
}

export const pagouAiService = new PagouAiService();
