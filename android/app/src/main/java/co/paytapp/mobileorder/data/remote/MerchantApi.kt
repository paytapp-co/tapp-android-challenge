package co.paytapp.mobileorder.data.remote

import kotlinx.serialization.Serializable
import retrofit2.http.GET

// Tapp merchant API for this venue. See docs/merchant-api.md.
interface MerchantApi {
    @GET("api/menu")
    suspend fun getMenu(): MenuResponse
}

@Serializable
data class MenuResponse(
    val venue: VenueDto,
    val items: List<MenuItemDto>,
)

@Serializable
data class VenueDto(
    val name: String,
    val location: String,
    val currency: String,
)

@Serializable
data class MenuItemDto(
    val id: String,
    val name: String,
    val category: String,
    val price: Int,
    val available: Boolean,
    val modifiers: List<ModifierDto>,
)

@Serializable
data class ModifierDto(
    val id: String,
    val name: String,
    val price: Int,
)
