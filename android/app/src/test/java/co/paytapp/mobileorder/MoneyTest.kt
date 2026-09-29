package co.paytapp.mobileorder

import co.paytapp.mobileorder.domain.formatPrice
import org.junit.Assert.assertEquals
import org.junit.Test

class MoneyTest {
    @Test
    fun formatsPounds() {
        assertEquals("£4.35", formatPrice(4.35))
    }
}
