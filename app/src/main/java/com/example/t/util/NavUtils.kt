package com.example.t.util

import android.os.Bundle
import androidx.fragment.app.Fragment
import androidx.navigation.NavOptions
import androidx.navigation.fragment.findNavController

fun Fragment.navigateSlide(destId: Int, args: Bundle? = null) {
    findNavController().navigate(
        destId,
        args,
        NavOptions.Builder()
            .setEnterAnim(com.example.t.R.anim.slide_in_right)
            .setExitAnim(com.example.t.R.anim.slide_out_left)
            .setPopEnterAnim(com.example.t.R.anim.slide_in_left)
            .setPopExitAnim(com.example.t.R.anim.slide_out_right)
            .build()
    )
}
