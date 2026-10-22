import { Capacitor, registerPlugin } from '@capacitor/core';
export const isAndroid=Capacitor.getPlatform()==='android';
const vault=registerPlugin('TokenVault');
export async function readToken(){return isAndroid ? (await vault.get()).value || '' : '';}
export async function saveToken(value){if(isAndroid) await vault.set({value});}
export async function forgetToken(){if(isAndroid) await vault.clear();}
