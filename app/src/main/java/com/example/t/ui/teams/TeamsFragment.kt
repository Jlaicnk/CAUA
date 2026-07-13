package com.example.t.ui.teams

import android.content.res.ColorStateList
import android.graphics.Color
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
import coil.load
import com.example.t.R
import com.example.t.data.model.Team
import com.example.t.data.repository.TeamRepository
import com.example.t.databinding.FragmentTeamsBinding
import com.example.t.databinding.ItemTeamRankBinding
import com.example.t.databinding.ItemTeamRankTopBinding
import com.example.t.util.navigateSlide
import kotlinx.coroutines.launch

class TeamsFragment : Fragment() {

    private var _binding: FragmentTeamsBinding? = null
    private val binding get() = _binding!!
    private val repository = TeamRepository()
    private lateinit var adapter: TeamRankAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTeamsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = TeamRankAdapter { team ->
            navigateSlide(
                R.id.navigation_team_detail,
                Bundle().apply { putInt("teamId", team.id) }
            )
        }
        binding.recyclerTeams.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerTeams.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { loadTeams() }

        loadTeams()
    }

    private fun loadTeams() {
        viewLifecycleOwner.lifecycleScope.launch {
            repository.getTeams().onSuccess { teams ->
                adapter.submitList(teams)
                binding.progressIndicator.visibility = View.GONE
                binding.recyclerTeams.visibility = View.VISIBLE
                binding.tvEmpty.visibility = if (teams.isEmpty()) View.VISIBLE else View.GONE
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

class TeamRankAdapter(
    private val onClick: (Team) -> Unit
) : ListAdapter<Team, RecyclerView.ViewHolder>(
    object : DiffUtil.ItemCallback<Team>() {
        override fun areItemsTheSame(a: Team, b: Team) = a.id == b.id
        override fun areContentsTheSame(a: Team, b: Team) = a == b
    }
) {
    companion object {
        private const val TOP_VIEW = 0
        private const val NORMAL_VIEW = 1
    }

    override fun getItemViewType(position: Int): Int {
        return if (position < 3) TOP_VIEW else NORMAL_VIEW
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return if (viewType == TOP_VIEW) {
            val binding = ItemTeamRankTopBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            TopViewHolder(binding)
        } else {
            val binding = ItemTeamRankBinding.inflate(
                LayoutInflater.from(parent.context), parent, false
            )
            NormalViewHolder(binding)
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val team = getItem(position)
        if (holder is TopViewHolder) {
            holder.bind(team, position)
        } else if (holder is NormalViewHolder) {
            holder.bind(team)
        }
    }

    inner class TopViewHolder(private val binding: ItemTeamRankTopBinding) :
        RecyclerView.ViewHolder(binding.root) {
        fun bind(team: Team, position: Int) {
            val card = binding.root as com.google.android.material.card.MaterialCardView
            val (bgColor, rankColor) = when (position) {
                0 -> Pair(Color.parseColor("#FFF9C4"), Color.parseColor("#FFF57F17"))
                1 -> Pair(Color.parseColor("#FFCFD8DC"), Color.parseColor("#FF546E7A"))
                else -> Pair(Color.parseColor("#FFFFCCBC"), Color.parseColor("#FFE64A19"))
            }
            card.setCardBackgroundColor(ColorStateList.valueOf(bgColor))
            binding.tvRank.setTextColor(rankColor)
            binding.tvRank.text = "#${team.rank}"
            binding.tvName.text = team.name
            binding.ivLogo.load(team.logo) {
                placeholder(R.drawable.ic_trophy)
                error(R.drawable.ic_trophy)
                crossfade(true)
            }
            binding.root.setOnClickListener { onClick(team) }
        }
    }

    inner class NormalViewHolder(private val binding: ItemTeamRankBinding) :
        RecyclerView.ViewHolder(binding.root) {
        fun bind(team: Team) {
            binding.tvRank.text = "#${team.rank}"
            binding.tvName.text = team.name
            binding.ivLogo.load(team.logo) {
                placeholder(R.drawable.ic_trophy)
                error(R.drawable.ic_trophy)
                crossfade(true)
            }
            binding.root.setOnClickListener { onClick(team) }
        }
    }
}
