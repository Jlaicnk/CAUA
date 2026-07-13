package com.example.t.ui.teams.detail

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.datasource.okhttp.OkHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.navigation.fragment.findNavController
import coil.load
import com.example.t.util.navigateSlide
import com.example.t.R
import com.example.t.data.repository.TeamRepository
import com.example.t.databinding.FragmentTeamDetailBinding
import com.example.t.databinding.ItemPlayerBinding
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient

class TeamDetailFragment : Fragment() {

    private var _binding: FragmentTeamDetailBinding? = null
    private val binding get() = _binding!!
    private val repository = TeamRepository()
    private var player: ExoPlayer? = null
    private var playerReady = false

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTeamDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val teamId = requireArguments().getInt("teamId")

        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        viewLifecycleOwner.lifecycleScope.launch {
            repository.getTeam(teamId).onSuccess { team ->
                binding.apply {
                    tvRank.text = "排名: #${team.rank}"
                    ivLogo.load(team.logo) {
                        placeholder(R.drawable.ic_trophy)
                        error(R.drawable.ic_trophy)
                        crossfade(true)
                    }
                    tvTeamName.text = team.name
                    tvDescription.text = team.description.ifBlank { "暂无简介" }

                    if (!team.song.isNullOrBlank()) {
                        fabPlay.visibility = View.VISIBLE
                        setupPlayer(team.song!!)
                    }

                    layoutPlayers.removeAllViews()
                    team.players?.forEach { p ->
                        val item = ItemPlayerBinding.inflate(layoutInflater)
                        item.root.setOnClickListener {
                            navigateSlide(
                                R.id.navigation_player_detail,
                                Bundle().apply { putInt("playerId", p.id) }
                            )
                        }
                        item.tvNumber.text = p.number.toString()
                        item.tvName.text = p.name
                        item.tvPosition.text = p.position
                        layoutPlayers.addView(item.root)
                    }
                }
            }
        }
    }

    private fun setupPlayer(songUrl: String) {
        val dataSourceFactory = OkHttpDataSource.Factory(OkHttpClient())
        val source = ProgressiveMediaSource.Factory(dataSourceFactory)
            .createMediaSource(MediaItem.fromUri(songUrl))

        player = ExoPlayer.Builder(requireContext()).build().apply {
            setMediaSource(source)
            prepare()
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    when (state) {
                        Player.STATE_READY -> {
                            playerReady = true
                            binding.fabPlay.isEnabled = true
                            binding.fabPlay.setImageResource(
                                if (playWhenReady) R.drawable.ic_pause else R.drawable.ic_play
                            )
                        }
                        Player.STATE_ENDED -> {
                            binding.fabPlay.setImageResource(R.drawable.ic_play)
                            stop()
                        }
                        Player.STATE_BUFFERING -> {
                            binding.fabPlay.isEnabled = false
                        }
                    }
                }
            })
        }

        binding.fabPlay.setOnClickListener {
            val p = player ?: return@setOnClickListener
            if (!playerReady) return@setOnClickListener

            if (p.isPlaying) {
                fadeOutAndPause(p)
            } else {
                p.volume = 1f
                p.playWhenReady = true
                binding.fabPlay.setImageResource(R.drawable.ic_pause)
            }
        }
    }

    private fun fadeOutAndPause(p: ExoPlayer) {
        binding.fabPlay.isEnabled = false
        viewLifecycleOwner.lifecycleScope.launch {
            val steps = 10
            val delayMs = 50L
            for (i in steps downTo 0) {
                if (!isActive) break
                p.volume = i.toFloat() / steps
                delay(delayMs)
            }
            p.pause()
            p.volume = 1f
            binding.fabPlay.setImageResource(R.drawable.ic_play)
            binding.fabPlay.isEnabled = true
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        player?.release()
        player = null
        _binding = null
    }
}
