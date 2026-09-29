package co.paytapp.mobileorder.ui.checkout

import android.annotation.SuppressLint
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import co.paytapp.mobileorder.BuildConfig

// Shows Tapp Checkout inside the app and watches for the redirect back to our return URL.
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun CheckoutScreen(
    paymentUrl: String,
    onPaid: () -> Unit,
    onNotPaid: () -> Unit,
    viewModel: CheckoutViewModel = hiltViewModel(),
) {
    AndroidView(
        modifier = Modifier.fillMaxSize(),
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.allowFileAccess = true
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                        val url = request.url
                        if (url.toString().startsWith("${BuildConfig.API_BASE_URL}checkout/return")) {
                            if (url.getQueryParameter("status") == "authorised") {
                                viewModel.clearBasket()
                                onPaid()
                            } else {
                                onNotPaid()
                            }
                            return true
                        }
                        return false
                    }
                }
                loadUrl(paymentUrl)
            }
        },
    )
}
