package com.chimiasama.mindbreak;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Closing the native activity is available only to the confirmed exit action. */
@CapacitorPlugin(name = "GameShell")
public class GameShellPlugin extends Plugin {
    @PluginMethod
    public void exitApp(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            call.resolve();
            getActivity().finish();
        });
    }
}
