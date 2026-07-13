package com.example.t.ui.home

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import androidx.viewpager2.widget.ViewPager2
import coil.load
import com.example.t.R
import com.example.t.data.model.Banner
import com.example.t.data.model.FeedItem
import com.example.t.data.model.HomeResponse
import com.example.t.data.repository.HomeRepository
import com.example.t.databinding.FragmentHomeBinding
import com.example.t.databinding.ItemBannerBinding
import com.example.t.databinding.ItemFeedBinding
import kotlinx.coroutines.launch

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val repository = HomeRepository()
    private var bannerAdapter: BannerAdapter? = null
    private var feedAdapter: FeedAdapter? = null
    private val handler = Handler(Looper.getMainLooper())
    private var bannerRunnable: Runnable? = null

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.swipeRefresh.setOnRefreshListener { loadData() }
        loadData()
    }

    private fun loadData() {
        viewLifecycleOwner.lifecycleScope.launch {
            repository.getHomeData().onSuccess { home ->
                setupBanner(home.banners)
                setupFeeds(home.feeds)
                binding.progressIndicator.visibility = View.GONE
            }.onFailure {
                binding.progressIndicator.visibility = View.GONE
            }
            binding.swipeRefresh.isRefreshing = false
        }
    }

    private fun setupBanner(banners: List<Banner>) {
        if (banners.isEmpty()) return
        bannerAdapter = BannerAdapter(banners)
        binding.viewPagerBanner.adapter = bannerAdapter
        setupDots(banners.size)
        startAutoScroll(banners.size)
    }

    private fun setupDots(count: Int) {
        binding.dotsContainer.removeAllViews()
        for (i in 0 until count) {
            val dot = ImageView(requireContext()).apply {
                setImageResource(R.drawable.ic_home)
                val size = (12 * resources.displayMetrics.density).toInt()
                layoutParams = LinearLayout.LayoutParams(size, size).apply {
                    setMargins(4.dp, 0, 4.dp, 0)
                }
            }
            binding.dotsContainer.addView(dot)
        }
        updateDots(0)
    }

    private fun updateDots(position: Int) {
        for (i in 0 until binding.dotsContainer.childCount) {
            val dot = binding.dotsContainer.getChildAt(i) as? ImageView ?: continue
            dot.alpha = if (i == position) 1.0f else 0.35f
        }
    }

    private fun startAutoScroll(count: Int) {
        if (count <= 1) return
        stopAutoScroll()
        bannerRunnable = object : Runnable {
            override fun run() {
                val next = (binding.viewPagerBanner.currentItem + 1) % count
                binding.viewPagerBanner.setCurrentItem(next, true)
                handler.postDelayed(this, 3000L)
            }
        }
        handler.postDelayed(bannerRunnable!!, 3000L)

        binding.viewPagerBanner.registerOnPageChangeCallback(object : ViewPager2.OnPageChangeCallback() {
            override fun onPageSelected(position: Int) {
                updateDots(position)
            }
        })
    }

    private fun stopAutoScroll() {
        bannerRunnable?.let { handler.removeCallbacks(it) }
    }

    private fun setupFeeds(feeds: List<FeedItem>) {
        feedAdapter = FeedAdapter { item ->
            if (!item.video.isNullOrBlank()) {
                val intent = Intent(requireContext(), VideoPlayerActivity::class.java)
                intent.putExtra("url", item.video)
                intent.putExtra("title", item.title)
                startActivity(intent)
            }
        }
        binding.recyclerFeeds.apply {
            layoutManager = GridLayoutManager(requireContext(), 2)
            adapter = feedAdapter
            visibility = View.VISIBLE
        }
        feedAdapter?.submitList(feeds)
    }

    override fun onPause() {
        super.onPause()
        stopAutoScroll()
    }

    override fun onResume() {
        super.onResume()
        bannerAdapter?.let { startAutoScroll(it.itemCount) }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        stopAutoScroll()
        _binding = null
    }

    private val Int.dp: Int
        get() = (this * resources.displayMetrics.density).toInt()
}

private class BannerAdapter(private val items: List<Banner>) :
    RecyclerView.Adapter<BannerAdapter.Holder>() {

    override fun getItemCount() = items.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val binding = ItemBannerBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return Holder(binding)
    }

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val item = items[position]
        holder.binding.ivBanner.load(item.image) {
            placeholder(R.drawable.ic_trophy)
            error(R.drawable.ic_trophy)
            crossfade(true)
        }
    }

    class Holder(val binding: ItemBannerBinding) : RecyclerView.ViewHolder(binding.root)
}

private class FeedAdapter(
    private val onClick: (FeedItem) -> Unit
) : ListAdapter<FeedItem, FeedAdapter.Holder>(
    object : DiffUtil.ItemCallback<FeedItem>() {
        override fun areItemsTheSame(a: FeedItem, b: FeedItem) = a.id == b.id
        override fun areContentsTheSame(a: FeedItem, b: FeedItem) = a == b
    }
) {
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val binding = ItemFeedBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return Holder(binding)
    }

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val item = getItem(position)
        holder.binding.apply {
            ivCover.load(item.cover) {
                placeholder(R.drawable.ic_play)
                error(R.drawable.ic_play)
                crossfade(true)
            }
            tvTitle.text = item.title
            root.setOnClickListener { onClick(item) }
        }
    }

    class Holder(val binding: ItemFeedBinding) : RecyclerView.ViewHolder(binding.root)
}
