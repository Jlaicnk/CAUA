package com.example.t.ui.events.schedule

import android.content.res.ColorStateList
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.example.t.data.model.Match
import com.example.t.data.repository.TournamentRepository
import com.example.t.databinding.FragmentScheduleBinding
import com.example.t.databinding.ItemMatchBinding
import com.google.android.material.chip.Chip
import com.google.android.material.color.MaterialColors
import kotlinx.coroutines.launch

class ScheduleFragment : Fragment() {

    private var _binding: FragmentScheduleBinding? = null
    private val binding get() = _binding!!
    private val repository = TournamentRepository()
    private lateinit var adapter: MatchAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentScheduleBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = MatchAdapter()
        binding.recyclerSchedule.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerSchedule.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { loadMatches() }

        loadMatches()
    }

    private fun loadMatches() {
        viewLifecycleOwner.lifecycleScope.launch {
            repository.getMatches().onSuccess { matches ->
                adapter.submitList(matches)
                binding.progressIndicator.visibility = View.GONE
                binding.recyclerSchedule.visibility = View.VISIBLE
                binding.tvEmpty.visibility = if (matches.isEmpty()) View.VISIBLE else View.GONE
            }.onFailure { e ->
                binding.progressIndicator.visibility = View.GONE
                binding.tvEmpty.visibility = View.VISIBLE
                binding.tvEmpty.text = "加载失败: ${e.message}"
            }
            binding.swipeRefresh.isRefreshing = false
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class MatchAdapter : ListAdapter<Match, MatchAdapter.ViewHolder>(
    object : DiffUtil.ItemCallback<Match>() {
        override fun areItemsTheSame(a: Match, b: Match) = a.id == b.id
        override fun areContentsTheSame(a: Match, b: Match) = a == b
    }
) {
    class ViewHolder(val binding: ItemMatchBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemMatchBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val match = getItem(position)
        holder.binding.apply {
            tvTournament.text = match.tournamentName
            tvHomeTeam.text = match.homeTeam.name
            tvAwayTeam.text = match.awayTeam.name
            val score = when {
                match.homeScore != null && match.awayScore != null -> "${match.homeScore} - ${match.awayScore}"
                else -> "vs"
            }
            tvScore.text = score
            tvDate.text = match.matchDate.take(16).replace("T", " ")
            setupStatusChip(chipStatus, match.status)
        }
    }

    private fun setupStatusChip(chip: Chip, status: String) {
        val ctx = chip.context
        when (status) {
            "ongoing" -> {
                chip.text = "⚽ 进行中"
                val color = MaterialColors.getColor(ctx, com.google.android.material.R.attr.colorSecondary, "Secondary")
                chip.chipBackgroundColor = ColorStateList.valueOf(color)
                chip.setTextColor(MaterialColors.getColor(ctx, android.R.attr.colorBackground, "Bg"))
            }
            "finished" -> {
                chip.text = "完场"
                val color = MaterialColors.getColor(ctx, com.google.android.material.R.attr.colorSurfaceVariant, "SV")
                chip.chipBackgroundColor = ColorStateList.valueOf(color)
                chip.setTextColor(MaterialColors.getColor(ctx, com.google.android.material.R.attr.colorOnSurfaceVariant, "OSV"))
            }
            else -> {
                chip.text = "即将开始"
                val color = MaterialColors.getColor(ctx, com.google.android.material.R.attr.colorPrimaryContainer, "PC")
                chip.chipBackgroundColor = ColorStateList.valueOf(color)
                chip.setTextColor(MaterialColors.getColor(ctx, com.google.android.material.R.attr.colorOnPrimaryContainer, "OPC"))
            }
        }
    }
}
