"use client";

import { WebContainer } from "@webcontainer/api";
import { files } from "@/files";

// Keep globals on window to survive Fast Refresh and navigations
declare global {
  interface Window {
    __wc_instance__?: WebContainer;
    __wc_started__?: boolean;
    __wc_server_url__?: string;
    __wc_listeners__?: Set<(url: string) => void>;
    __wc_app_versions__?: Map<string, { id: string; name: string; code: string; timestamp: number; userPrompt: string; screenshot?: string }>;
    __wc_current_app_id__?: string;
    __wc_version_listeners__?: Set<() => void>;
  }
}

export interface AppVersion {
  id: string;
  name: string;
  code: string;
  timestamp: number;
  userPrompt: string;
  screenshot?: string; // Base64 encoded screenshot
}

function getListeners() {
  if (!window.__wc_listeners__) window.__wc_listeners__ = new Set();
  return window.__wc_listeners__;
}

function getAppVersions() {
  if (!window.__wc_app_versions__) window.__wc_app_versions__ = new Map();
  return window.__wc_app_versions__;
}

function getVersionListeners() {
  if (!window.__wc_version_listeners__) window.__wc_version_listeners__ = new Set();
  return window.__wc_version_listeners__;
}

export function onAppVersionsChange(cb: () => void) {
  const listeners = getVersionListeners();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function notifyVersionListeners() {
  const listeners = getVersionListeners();
  for (const fn of Array.from(listeners)) {
    try { fn(); } catch {}
  }
}

export function getLastPreviewUrl() {
  return window.__wc_server_url__;
}

export function onServerReadyOnce(cb: (url: string) => void) {
  const listeners = getListeners();
  listeners.add(cb);
  // return cleanup
  return () => listeners.delete(cb);
}

export async function ensureWebContainer() {
  if (typeof window === "undefined") return;

  if (window.__wc_instance__) {
    return window.__wc_instance__;
  }

  const wc = await WebContainer.boot();
  window.__wc_instance__ = wc;

  // Mount project once
  await wc.mount(files as any);

  // Attach server-ready listener once and fan-out to component listeners
  wc.on("server-ready", (port, hostOrUrl) => {
    const raw = String(hostOrUrl);
    const url = raw.includes("://") ? raw : `http://${raw}:${port}`;
    window.__wc_server_url__ = url;
    for (const fn of Array.from(getListeners())) {
      try { fn(url); } catch {}
    }
    getListeners().clear();
  });

  // Start only once per session
  if (!window.__wc_started__) {
    window.__wc_started__ = true;
    // Install deps and run dev
    const install = await wc.spawn("npm", ["install"]);
    await install.exit;
    await wc.spawn("npm", ["run", "dev"]);
  }

  return wc;
}

export async function writeFileInWebContainer(path: string, contents: string) {
  const wc = await ensureWebContainer();
  // ensureWebContainer may return void on server; guard in client
  if (!wc) return;
  await wc.fs.writeFile(path, contents);
}

export async function updateAppTsx(appCode: string) {
  // Some responses may come fenced like ```jsx ... ```; strip fences
  const cleaned = stripMarkdownFences(appCode);
  await writeFileInWebContainer("/src/App.tsx", cleaned);
}

export async function captureWebContainerScreenshot(): Promise<string | null> {
  try {
    console.log('🔍 Starting screenshot capture process...');
    
    // First, ensure WebContainer is booted and ready
    const wc = await ensureWebContainer();
    if (!wc) {
      console.warn('❌ WebContainer not available');
      return null;
    }

    console.log('✅ WebContainer is ready');

    // Wait for WebContainer to be fully loaded
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Find the WebContainer iframe - try multiple approaches
    let iframe: HTMLIFrameElement | null = null;
    
    // Method 1: Try specific title selector
    iframe = document.querySelector('iframe[title="WebContainer Preview"]') as HTMLIFrameElement;
    
    // Method 2: Try any iframe if first method fails
    if (!iframe) {
      const allIframes = document.querySelectorAll('iframe');
      console.log('🔍 Found iframes:', allIframes.length);
      for (let i = 0; i < allIframes.length; i++) {
        const currentIframe = allIframes[i] as HTMLIFrameElement;
        console.log(`Iframe ${i}:`, {
          title: currentIframe.title,
          src: currentIframe.src,
          width: currentIframe.offsetWidth,
          height: currentIframe.offsetHeight
        });
        if (currentIframe.src && currentIframe.offsetWidth > 100) {
          iframe = currentIframe;
          break;
        }
      }
    }

    if (!iframe) {
      console.warn('❌ No suitable iframe found for screenshot');
      return null;
    }

    console.log('✅ Found iframe:', iframe);
    console.log('Iframe details:', {
      title: iframe.title,
      src: iframe.src,
      dimensions: `${iframe.offsetWidth}x${iframe.offsetHeight}`,
      visible: iframe.offsetWidth > 0 && iframe.offsetHeight > 0
    });

    // Wait for iframe content to load
    if (!iframe.src) {
      console.log('⏳ Waiting for iframe src to be set...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Import html2canvas
    console.log('📸 Importing html2canvas...');
    const { default: html2canvas } = await import('html2canvas');
    
    // Wait a bit more for content to render
    console.log('⏳ Waiting for content to render...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎨 Capturing screenshot...');
    
    // Capture the iframe element with simpler options
    const canvas = await html2canvas(iframe, {
      width: 400,
      height: 300,
      scale: 0.7,
      useCORS: false,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
      foreignObjectRendering: false,
      removeContainer: false,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0
    });

    console.log('✅ Canvas created:', canvas.width, 'x', canvas.height);

    // Convert to base64
    const screenshot = canvas.toDataURL('image/png', 0.8);
    console.log('✅ Screenshot captured successfully, size:', screenshot.length, 'characters');
    return screenshot;
    
  } catch (error) {
    console.error('❌ Failed to capture screenshot:', error);
    
    // Create a better fallback screenshot
    try {
      console.log('🔄 Creating fallback screenshot...');
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw a gradient background
        const gradient = ctx.createLinearGradient(0, 0, 400, 300);
        gradient.addColorStop(0, '#f8fafc');
        gradient.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 300);
        
        // Draw app icon
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📱', 200, 120);
        
        // Draw app name
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 18px Arial';
        ctx.fillText('App Preview', 200, 160);
        
        // Draw status
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Arial';
        ctx.fillText('Screenshot unavailable', 200, 180);
        
        const fallbackScreenshot = canvas.toDataURL('image/png', 0.9);
        console.log('✅ Fallback screenshot created');
        return fallbackScreenshot;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback screenshot creation failed:', fallbackError);
    }
    
    return null;
  }
}

export async function saveAppVersion(appCode: string, userPrompt: string, appName?: string): Promise<string> {
  const cleaned = stripMarkdownFences(appCode);
  const appId = crypto.randomUUID();
  const versions = getAppVersions();
  
  const version: AppVersion = {
    id: appId,
    name: appName || `App ${versions.size + 1}`,
    code: cleaned,
    timestamp: Date.now(),
    userPrompt
  };
  
  versions.set(appId, version);
  window.__wc_current_app_id__ = appId;
  
  // Update the current running app
  await updateAppTsx(cleaned);
  
  // Capture screenshot after a delay to ensure the app has rendered
  setTimeout(async () => {
    console.log('Attempting to capture screenshot for app:', appId);
    const screenshot = await captureWebContainerScreenshot();
    if (screenshot) {
      console.log('Screenshot captured and saved for app:', appId);
      const updatedVersion = versions.get(appId);
      if (updatedVersion) {
        updatedVersion.screenshot = screenshot;
        versions.set(appId, updatedVersion);
        notifyVersionListeners(); // Notify listeners that versions have changed
      }
    } else {
      console.warn('Failed to capture screenshot for app:', appId);
    }
  }, 6000); // Wait 6 seconds for app to fully render
  
  return appId;
}

export function getAllAppVersions(): AppVersion[] {
  const versions = getAppVersions();
  return Array.from(versions.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export function getCurrentAppId(): string | undefined {
  return window.__wc_current_app_id__;
}

export async function switchToAppVersion(appId: string): Promise<boolean> {
  const versions = getAppVersions();
  const version = versions.get(appId);
  
  if (!version) {
    return false;
  }
  
  window.__wc_current_app_id__ = appId;
  await updateAppTsx(version.code);
  return true;
}

export function deleteAppVersion(appId: string): boolean {
  const versions = getAppVersions();
  const deleted = versions.delete(appId);
  
  // If we deleted the current app, switch to the most recent one
  if (deleted && window.__wc_current_app_id__ === appId) {
    const remainingVersions = Array.from(versions.values()).sort((a, b) => b.timestamp - a.timestamp);
    if (remainingVersions.length > 0) {
      window.__wc_current_app_id__ = remainingVersions[0].id;
    } else {
      window.__wc_current_app_id__ = undefined;
    }
  }
  
  return deleted;
}

export async function captureScreenshotForApp(appId: string): Promise<boolean> {
  const versions = getAppVersions();
  const version = versions.get(appId);
  
  if (!version) {
    console.warn('App version not found for screenshot capture:', appId);
    return false;
  }
  
  console.log('📸 Manual screenshot capture for app:', appId);
  
  // Switch to the app first to ensure it's loaded
  await switchToAppVersion(appId);
  
  // Wait longer for the app to render
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Capture screenshot
  const screenshot = await captureWebContainerScreenshot();
  if (screenshot) {
    version.screenshot = screenshot;
    versions.set(appId, version);
    notifyVersionListeners();
    console.log('✅ Manual screenshot captured for app:', appId);
    return true;
  }
  
  console.warn('❌ Manual screenshot capture failed for app:', appId);
  return false;
}

function stripMarkdownFences(code: string) {
  const fenceMatch = code.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim() + "\n";
  return code;
}

// Debug function - can be called from browser console
export function debugScreenshotCapture() {
  console.log('🔧 Debug Screenshot Capture');
  console.log('Available iframes:', document.querySelectorAll('iframe'));
  console.log('WebContainer iframe:', document.querySelector('iframe[title="WebContainer Preview"]'));
  console.log('App versions:', getAllAppVersions());
  console.log('Current app ID:', getCurrentAppId());
  
  // Try to capture screenshot manually
  captureWebContainerScreenshot().then(result => {
    console.log('Manual screenshot result:', result ? 'Success' : 'Failed');
    if (result) {
      console.log('Screenshot preview:', result.substring(0, 100) + '...');
    }
  });
}

// Simple test function to create a screenshot without iframe
export function createTestScreenshot(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Draw a test pattern
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 400, 300);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Test App', 200, 100);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px Arial';
    ctx.fillText('This is a test screenshot', 200, 150);
    
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(150, 200, 100, 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText('Button', 200, 225);
  }
  
  return canvas.toDataURL('image/png', 0.9);
}

// Make debug functions available globally
if (typeof window !== 'undefined') {
  (window as any).debugScreenshotCapture = debugScreenshotCapture;
  (window as any).createTestScreenshot = createTestScreenshot;
  (window as any).testScreenshot = () => {
    const testScreenshot = createTestScreenshot();
    console.log('Test screenshot created:', testScreenshot.substring(0, 100) + '...');
    return testScreenshot;
  };
}


