/**
 * Mobile Bridge Engine for VMS EMP Corporate Edition
 * Handles Native Device Features & Google Apps Script (GAS) Communication
 */

export interface VisitorData {
  row_index?: number;
  id?: string;
  telepon: string;
  nama: string;
  visitorId: string;
  perusahaan: string;
  bertemu: string;
  lantai: string;
  keperluan: string;
  divisi: string;
  status?: 'Hadir' | 'Selesai';
  masuk?: string;
  keluar?: string;
  tanggal?: string;
}

export interface StaffData {
  nama: string;
  divisi: string;
  lantai: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  action?: 'checkin' | 'checkout';
  nama?: string;
  user?: { fullname: string; role?: string };
  data?: T;
}

export class MobileBridge {
  // Ganti URL di bawah ini dengan Web App Deployment URL dari Google Apps Script Anda
  private static gasEndpoint: string = "https://script.google.com/macros/s/AKfycbxjwmnXtku-5v62zuvEm_fC89Df0WIwsLGyQyTGh1njMWrugZemLtdsQGx6yzyrPpMx/exec";

  /**
   * Memeriksa apakah aplikasi berjalan di dalam APK Native Android
   */
  public static isNative(): boolean {
    return typeof window !== 'undefined' && Object.prototype.hasOwnProperty.call(window, 'Capacitor');
  }

  /**
   * Adapter Komunikasi Backend Universal (google.script.run vs HTTP REST API)
   */
  public static async callBackend<T>(functionName: string, ...args: unknown[]): Promise<T> {
    // Mode 1: Berjalan di dalam lingkungan Google Apps Script Web App
    if (typeof window !== 'undefined' && (window as unknown as { google?: { script?: { run: Record<string, Function> } } }).google?.script?.run) {
      const googleScript = (window as unknown as { google: { script: { run: Record<string, Function> } } }).google.script;
      return new Promise<T>((resolve, reject) => {
        const runner = googleScript.run
          .withSuccessHandler((res: T) => resolve(res))
          .withFailureHandler((err: unknown) => reject(err));
        
        if (typeof runner[functionName] === 'function') {
          runner[functionName](...args);
        } else {
          reject(new Error(`Fungsi ${functionName} tidak ditemukan di GAS Backend.`));
        }
      });
    }

    // Mode 2: Berjalan di APK Standalone / Vercel Web
    try {
      const response = await fetch(this.gasEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: functionName,
          payload: JSON.stringify(args)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      const result = await response.json();
      return result as T;
    } catch (error) {
      console.error(`[MobileBridge Error] Panggilan ${functionName} gagal:`, error);
      throw error;
    }
  }

  /**
   * Triggers Haptic Vibration pada Perangkat Android
   */
  public static async vibrate(type: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const duration = type === 'light' ? 40 : type === 'medium' ? 80 : 150;
      navigator.vibrate(duration);
    }
  }

  /**
   * Menampilkan Notifikasi Lokal Android
   */
  public static async showNotification(title: string, body: string): Promise<void> {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body });
        }
      }
    }
  }
}
