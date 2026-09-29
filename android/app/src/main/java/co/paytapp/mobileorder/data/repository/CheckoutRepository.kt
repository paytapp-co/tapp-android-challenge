package co.paytapp.mobileorder.data.repository

import co.paytapp.mobileorder.BuildConfig
import co.paytapp.mobileorder.data.remote.CreatePaymentSessionRequest
import co.paytapp.mobileorder.data.remote.PaymentSessionDto
import co.paytapp.mobileorder.data.remote.TappApi
import java.util.UUID
import javax.inject.Inject

class CheckoutRepository @Inject constructor(
    private val tappApi: TappApi,
) {
    suspend fun startPayment(total: Double): PaymentSessionDto {
        val reference = UUID.randomUUID().toString()
        return tappApi.createPaymentSession(
            authorization = "Bearer ${BuildConfig.TAPP_API_KEY}",
            body = CreatePaymentSessionRequest(
                amount = (total * 100).toInt(),
                currency = "GBP",
                reference = reference,
                returnUrl = "${BuildConfig.API_BASE_URL}checkout/return/$reference",
            ),
        )
    }
}
