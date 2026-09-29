package co.paytapp.mobileorder.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val TappOrange = Color(0xFFD4572F)
val TappPurple = Color(0xFF8E86BC)
val Ink = Color(0xFF111827)
val Muted = Color(0xFF6B7280)

private val colours = lightColorScheme(
    primary = Ink,
    onPrimary = Color.White,
    secondary = TappOrange,
    tertiary = TappPurple,
    background = Color(0xFFF9FAFB),
    surface = Color.White,
    onSurface = Ink,
    onSurfaceVariant = Muted,
)

@Composable
fun TappTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = colours, content = content)
}
