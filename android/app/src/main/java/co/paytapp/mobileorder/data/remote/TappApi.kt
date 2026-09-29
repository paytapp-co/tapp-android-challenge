package co.paytapp.mobileorder.data.remote

import kotlinx.serialization.Serializable
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

// Calls Tapp Checkout directly so the app didn't have to wait for the backend to be finished.
interface TappApi {
    @POST("v1/payment-sessions")
    suspend fun createPaymentSession(
        @Header("Authorization") authorization: String,
        @Body body: CreatePaymentSessionRequest,
    ): PaymentSessionDto
}

@Serializable
data class CreatePaymentSessionRequest(
    val amount: Int,
    val currency: String,
    val reference: String,
    val returnUrl: String,
)

@Serializable
data class PaymentSessionDto(
    val id: String,
    val status: String,
    val amount: Int,
    val currency: String,
    val redirectUrl: String,
)
