package com.example.t.ui.events.tournaments

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.ViewModel
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewModelScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.load
import com.example.t.R
import com.example.t.data.model.Tournament
import com.example.t.data.repository.TournamentRepository
import com.example.t.databinding.FragmentTournamentListBinding
import com.example.t.databinding.ItemTournamentBinding
import com.example.t.util.navigateSlide
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class TournamentListViewModel : ViewModel() {
    private val repository = TournamentRepository()
    private val _tournaments = MutableStateFlow<List<Tournament>>(emptyList())
    private val _loading = MutableStateFlow(true)
    val tournaments = _tournaments.asStateFlow()
    val loading = _loading.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _loading.value = true
            repository.getTournaments().onSuccess { _tournaments.value = it }
            _loading.value = false
        }
    }
}

class TournamentListFragment : Fragment() {

    private var _binding: FragmentTournamentListBinding? = null
    private val binding get() = _binding!!
    private val viewModel: TournamentListViewModel by viewModels()
    private lateinit var adapter: TournamentAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentTournamentListBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = TournamentAdapter { tournament ->
            navigateSlide(
                R.id.navigation_tournament_detail,
                Bundle().apply { putInt("tournamentId", tournament.id) }
            )
        }
        binding.recyclerTournaments.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerTournaments.adapter = adapter

        binding.swipeRefresh.setOnRefreshListener { viewModel.load() }

        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.loading.collect { loading ->
                binding.progressIndicator.visibility = if (loading) View.VISIBLE else View.GONE
            }
        }
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.tournaments.collect { list ->
                adapter.submitList(list)
                binding.recyclerTournaments.visibility = if (list.isEmpty()) View.GONE else View.VISIBLE
                binding.tvEmpty.visibility = if (list.isEmpty()) View.VISIBLE else View.GONE
                binding.swipeRefresh.isRefreshing = false
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}

class TournamentAdapter(
    private val onClick: (Tournament) -> Unit
) : ListAdapter<Tournament, TournamentAdapter.ViewHolder>(
    object : DiffUtil.ItemCallback<Tournament>() {
        override fun areItemsTheSame(a: Tournament, b: Tournament) = a.id == b.id
        override fun areContentsTheSame(a: Tournament, b: Tournament) = a == b
    }
) {
    class ViewHolder(val binding: ItemTournamentBinding) :
        RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemTournamentBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = getItem(position)
        holder.binding.apply {
            tvName.text = item.name
            tvDate.text = "${item.startDate} ~ ${item.endDate}"
            ivIcon.load(item.icon) {
                placeholder(R.drawable.ic_trophy)
                error(R.drawable.ic_trophy)
                crossfade(true)
            }
            root.setOnClickListener { onClick(item) }
        }
    }
}
