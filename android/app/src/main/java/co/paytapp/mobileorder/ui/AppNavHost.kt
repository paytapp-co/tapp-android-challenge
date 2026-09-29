package co.paytapp.mobileorder.ui

import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import co.paytapp.mobileorder.ui.basket.BasketScreen
import co.paytapp.mobileorder.ui.checkout.CheckoutScreen
import co.paytapp.mobileorder.ui.checkout.PaymentSuccessScreen
import co.paytapp.mobileorder.ui.menu.MenuScreen
import co.paytapp.mobileorder.ui.order.OrderStatusScreen

@Composable
fun AppNavHost() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "menu") {
        composable("menu") {
            MenuScreen(onOpenBasket = { navController.navigate("basket") })
        }
        composable("basket") {
            BasketScreen(
                onBack = { navController.popBackStack() },
                onPay = { paymentUrl -> navController.navigate("checkout?url=${Uri.encode(paymentUrl)}") },
            )
        }
        composable(
            "checkout?url={url}",
            arguments = listOf(navArgument("url") { type = NavType.StringType }),
        ) { entry ->
            CheckoutScreen(
                paymentUrl = entry.arguments?.getString("url").orEmpty(),
                onPaid = { navController.navigate("success") { popUpTo("menu") } },
                onNotPaid = { navController.popBackStack() },
            )
        }
        composable("success") {
            PaymentSuccessScreen(onDone = { navController.popBackStack("menu", inclusive = false) })
        }
        composable(
            "orders/{orderId}",
            arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
        ) { entry ->
            OrderStatusScreen(orderId = entry.arguments?.getString("orderId").orEmpty())
        }
    }
}
