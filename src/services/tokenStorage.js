import { Capacitor, registerPlugin } from '@capacitor/core';
export const isAndroid=Capacitor.getPlatform()==='android';
const vault=registerPlugin('TokenVault');
const key='dsp2_api_token';
export async function readToken(){return isAndroid ? (await vault.get()).value || '' : localStorage.getItem(key) || '';}
export async function saveToken(value){if(isAndroid) await vault.set({value}); else localStorage.setItem(key,value);}
export async function forgetToken(){if(isAndroid) await vault.clear(); else localStorage.removeItem(key);}
