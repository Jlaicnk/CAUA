package com.example.t.ui.events.tournaments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import coil.load
import com.example.t.R
import com.example.t.data.repository.TournamentRepository
import com.example.t.databinding.FragmentTournamentDetailBinding
import com.example.t.databinding.ItemTeamRankBinding
import kotlinx.coroutines.launch

class TournamentDetailFragment : Fragment() {

    private var _binding: FragmentTournamentDetailBinding? = null
    private val binding get() = _binding!!
    private val repository = TournamentRepository()

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTournamentDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val tournamentId = requireArguments().getInt("tournamentId")

        binding.toolbar.setNavigationOnClickListener {
            findNavController().navigateUp()
        }

        viewLifecycleOwner.lifecycleScope.launch {
            repository.getTournament(tournamentId).onSuccess { tournament ->
                binding.apply {
                    tvTournamentName.text = tournament.name
                    ivTournamentIcon.load(tournament.icon) {
                        placeholder(R.drawable.ic_trophy)
                        error(R.drawable.ic_trophy)
                        crossfade(true)
                    }
                    tvTournamentDate.text = "${tournament.startDate} ~ ${tournament.endDate}"
                    tvRules.text = tournament.rules.ifBlank { "暂无规则说明" }
                    tournament.teams?.forEach { td ->
                        val item = ItemTeamRankBinding.inflate(layoutInflater)
                        item.tvRank.text = "#${td.rank ?: td.globalRank ?: "-"}"
                        item.tvName.text = "${td.team.name}  (总榜 #${td.globalRank ?: "-"})"
                        item.ivLogo.load(td.team.logo) {
                            placeholder(R.drawable.ic_trophy)
                            error(R.drawable.ic_trophy)
                            crossfade(true)
                        }
                        layoutTeams.addView(item.root)
                    }
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
