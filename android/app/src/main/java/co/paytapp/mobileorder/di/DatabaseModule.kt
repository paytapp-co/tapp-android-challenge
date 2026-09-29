package co.paytapp.mobileorder.di

import android.content.Context
import androidx.room.Room
import co.paytapp.mobileorder.data.local.AppDatabase
import co.paytapp.mobileorder.data.local.BasketDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "mobile-order.db")
            .allowMainThreadQueries()
            .build()

    @Provides
    fun provideBasketDao(database: AppDatabase): BasketDao = database.basketDao()
}
