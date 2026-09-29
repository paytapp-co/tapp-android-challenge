package co.paytapp.mobileorder.domain

data class Venue(
    val name: String,
    val location: String,
    val currency: String,
)

data class Menu(
    val venue: Venue,
    val items: List<MenuItem>,
)

data class MenuItem(
    val id: String,
    val name: String,
    val category: String,
    val price: Double,
    val available: Boolean,
    val modifiers: List<Modifier>,
)

data class Modifier(
    val id: String,
    val name: String,
    val price: Double,
)

data class BasketLine(
    val itemId: String,
    val name: String,
    val modifierNames: List<String>,
    val unitPrice: Double,
    val quantity: Int,
)
