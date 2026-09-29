package co.paytapp.mobileorder

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import co.paytapp.mobileorder.ui.AppNavHost
import co.paytapp.mobileorder.ui.theme.TappTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TappTheme {
                AppNavHost()
            }
        }
    }
}
