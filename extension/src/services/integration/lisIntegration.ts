/**
 * LIS SaaS Integration Layer & Secure Deep Linking
 */

import environmentConfig from '../../config/environment';
import { authService } from '../auth/authService';

class LisIntegration {
  public getAppBaseUrl(): string {
    return environmentConfig.getConfig().appBaseUrl;
  }

  public async openWebApp(path: string = '/'): Promise<void> {
    const isAuthed = await authService.isAuthenticated();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const targetUrl = `${this.getAppBaseUrl()}${cleanPath}`;

    if (typeof chrome !== 'undefined' && chrome?.tabs?.create) {
      chrome.tabs.create({ url: targetUrl });
    } else {
      window.open(targetUrl, '_blank');
    }
  }

  public openPatient(patientId: string): Promise<void> {
    return this.openWebApp(`/patients?id=${encodeURIComponent(patientId)}`);
  }

  public openOrder(orderId: string): Promise<void> {
    return this.openWebApp(`/orders?id=${encodeURIComponent(orderId)}`);
  }

  public openReport(reportId: string): Promise<void> {
    return this.openWebApp(`/reports?id=${encodeURIComponent(reportId)}`);
  }

  public openInvoice(invoiceId: string): Promise<void> {
    return this.openWebApp(`/billing?invoiceId=${encodeURIComponent(invoiceId)}`);
  }

  public openSample(sampleId: string): Promise<void> {
    return this.openWebApp(`/samples?id=${encodeURIComponent(sampleId)}`);
  }
}

export const lisIntegration = new LisIntegration();
export default lisIntegration;
