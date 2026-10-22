package es.dsptools.clientsearch;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "TokenVault")
public class TokenVaultPlugin extends Plugin {
    private static final String ALIAS = "dsp2.api.token";
    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }
    @PluginMethod public void set(PluginCall call) {
        try {
            String value = call.getString("value");
            if (value == null || value.isEmpty()) { call.reject("Token vacío"); return; }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key());
            String encrypted = Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            String iv = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP);
            boolean saved = getContext().getSharedPreferences("dsp_token", Context.MODE_PRIVATE).edit().putString("value", encrypted).putString("iv", iv).commit();
            if (!saved) { call.reject("No se pudo guardar"); return; } call.resolve();
        } catch (Exception e) { call.reject("No se pudo guardar el token"); }
    }
    @PluginMethod public void get(PluginCall call) {
        try {
            var prefs = getContext().getSharedPreferences("dsp_token", Context.MODE_PRIVATE);
            String encrypted = prefs.getString("value", null); String value = "";
            if (encrypted != null) {
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(prefs.getString("iv", ""), Base64.NO_WRAP)));
                value = new String(cipher.doFinal(Base64.decode(encrypted, Base64.NO_WRAP)), StandardCharsets.UTF_8);
            }
            JSObject result = new JSObject(); result.put("value", value); call.resolve(result);
        } catch (Exception e) { call.reject("Ingresá el token nuevamente"); }
    }
    @PluginMethod public void clear(PluginCall call) {
        if (getContext().getSharedPreferences("dsp_token", Context.MODE_PRIVATE).edit().clear().commit()) call.resolve();
        else call.reject("No se pudo eliminar el token");
    }
}
