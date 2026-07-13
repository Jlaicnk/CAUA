package com.example.t.ui.teams.player

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import coil.load
import com.example.t.R
import com.example.t.data.repository.TeamRepository
import com.example.t.databinding.FragmentPlayerDetailBinding
import kotlinx.coroutines.launch

class PlayerDetailFragment : Fragment() {

    private var _binding: FragmentPlayerDetailBinding? = null
    private val binding get() = _binding!!
    private val repository = TeamRepository()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPlayerDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val playerId = requireArguments().getInt("playerId")

        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        viewLifecycleOwner.lifecycleScope.launch {
            repository.getPlayer(playerId).onSuccess { player ->
                binding.apply {
                    ivAvatar.load(player.avatar) {
                        placeholder(R.drawable.ic_profile)
                        error(R.drawable.ic_profile)
                        crossfade(true)
                    }
                    tvPlayerName.text = player.name
                    tvTeamName.text = player.teamName ?: ""
                    tvNumber.text = "号码: ${player.number}"
                    tvPosition.text = "位置: ${player.position}"
                    tvBio.text = player.bio.ifBlank { "暂无简介" }
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
