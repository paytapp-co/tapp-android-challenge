package co.paytapp.mobileorder.domain

fun formatPrice(value: Double): String = "£" + String.format("%.2f", value)
