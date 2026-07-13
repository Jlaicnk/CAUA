package com.example.t

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.navigation.NavOptions
import androidx.navigation.fragment.NavHostFragment
import com.example.t.data.api.RetrofitClient
import com.example.t.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        RetrofitClient.init(this)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        val navController = navHostFragment.navController
        val startDestId = navController.graph.startDestinationId

        binding.bottomNavigation.apply {
            itemIconTintList = null
            setOnItemSelectedListener { item ->
                navController.navigate(item.itemId, null,
                    NavOptions.Builder()
                        .setPopUpTo(startDestId, false)
                        .build()
                )
                true
            }
        }
    }
}
