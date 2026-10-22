package es.dsptools.clientsearch;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
 @Override public void onCreate(Bundle savedInstanceState) {
  registerPlugin(TokenVaultPlugin.class);
  super.onCreate(savedInstanceState);
 }
}
