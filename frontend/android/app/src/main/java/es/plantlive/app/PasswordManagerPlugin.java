package es.plantlive.app;

import android.os.CancellationSignal;
import androidx.credentials.CreatePasswordRequest;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPasswordOption;
import androidx.credentials.PasswordCredential;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.Executor;

@CapacitorPlugin(name = "PasswordManager")
public class PasswordManagerPlugin extends Plugin {
    private CredentialManager manager;

    @Override
    public void load() {
        manager = CredentialManager.create(getContext());
    }

    @PluginMethod
    public void save(PluginCall call) {
        String email = call.getString("email", "").trim();
        String password = call.getString("password", "");
        if (email.isEmpty() || password.isEmpty()) {
            call.reject("Faltan el correo o la contraseña.");
            return;
        }
        Executor executor = getActivity().getMainExecutor();
        manager.createCredentialAsync(
            getActivity(),
            new CreatePasswordRequest(email, password),
            new CancellationSignal(),
            executor,
            new CredentialManagerCallback<CreateCredentialResponse, CreateCredentialException>() {
                @Override public void onResult(CreateCredentialResponse result) { call.resolve(); }
                @Override public void onError(CreateCredentialException error) { call.reject(error.getMessage(), error); }
            }
        );
    }

    @PluginMethod
    public void get(PluginCall call) {
        GetCredentialRequest request = new GetCredentialRequest.Builder()
            .addCredentialOption(new GetPasswordOption())
            .build();
        Executor executor = getActivity().getMainExecutor();
        manager.getCredentialAsync(
            getActivity(),
            request,
            new CancellationSignal(),
            executor,
            new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                @Override public void onResult(GetCredentialResponse result) {
                    Credential credential = result.getCredential();
                    if (!(credential instanceof PasswordCredential)) {
                        call.reject("La cuenta elegida no contiene una contraseña.");
                        return;
                    }
                    PasswordCredential password = (PasswordCredential) credential;
                    JSObject data = new JSObject();
                    data.put("email", password.getId());
                    data.put("password", password.getPassword());
                    call.resolve(data);
                }
                @Override public void onError(GetCredentialException error) { call.reject(error.getMessage(), error); }
            }
        );
    }
}
