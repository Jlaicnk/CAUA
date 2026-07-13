package com.example.t.ui.profile

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
import com.example.t.data.local.TokenManager
import com.example.t.data.model.Team
import com.example.t.data.repository.AuthRepository
import com.example.t.data.repository.TeamRepository
import com.example.t.databinding.FragmentFavoriteTeamBinding
import com.example.t.databinding.ItemTeamRankBinding
import kotlinx.coroutines.launch

class FavoriteTeamFragment : Fragment() {

    private var _binding: FragmentFavoriteTeamBinding? = null
    private val binding get() = _binding!!
    private val teamRepository = TeamRepository()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentFavoriteTeamBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.toolbar.setNavigationOnClickListener {
            parentFragmentManager.popBackStack()
        }

        val adapter = SelectTeamAdapter { team ->
            val tokenManager = TokenManager.getInstance(requireContext())
            val authRepo = AuthRepository(tokenManager)
            viewLifecycleOwner.lifecycleScope.launch {
                authRepo.setFavoriteTeam(team.id).onSuccess {
                    parentFragmentManager.popBackStack()
                }
            }
        }

        binding.recyclerTeams.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerTeams.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { loadTeams() }

        loadTeams()
    }

    private fun loadTeams() {
        binding.progressIndicator.visibility = View.VISIBLE
        viewLifecycleOwner.lifecycleScope.launch {
            teamRepository.getTeams().onSuccess { teams ->
                binding.recyclerTeams.visibility = View.VISIBLE
                binding.tvEmpty.visibility = if (teams.isEmpty()) View.VISIBLE else View.GONE
                (binding.recyclerTeams.adapter as? SelectTeamAdapter)?.submitList(teams)
            }
            binding.progressIndicator.visibility = View.GONE
            binding.swipeRefresh.isRefreshing = false
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class SelectTeamAdapter(
    private val onClick: (Team) -> Unit
) : ListAdapter<Team, SelectTeamAdapter.ViewHolder>(
    object : DiffUtil.ItemCallback<Team>() {
        override fun areItemsTheSame(a: Team, b: Team) = a.id == b.id
        override fun areContentsTheSame(a: Team, b: Team) = a == b
    }
) {
    class ViewHolder(val binding: ItemTeamRankBinding) :
        RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemTeamRankBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val team = getItem(position)
        holder.binding.apply {
            tvRank.text = "#${team.rank}"
            tvName.text = team.name
            ivLogo.load(team.logo) {
                placeholder(R.drawable.ic_trophy)
                error(R.drawable.ic_trophy)
                crossfade(true)
            }
            root.setOnClickListener { onClick(team) }
        }
    }
}
