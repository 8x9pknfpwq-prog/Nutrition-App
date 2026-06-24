// Thin helpers around Capacitor so the same React app runs as a website and as
// a native iOS app. On the web, Capacitor.isNativePlatform() is false and we use
// browser APIs; inside the iOS shell it's true and we use native plugins.
import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
