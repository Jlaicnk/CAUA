package com.example.t.ui.profile

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.ViewModel
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewModelScope
import androidx.navigation.fragment.findNavController
import coil.load
import com.example.t.util.navigateSlide
import com.example.t.R
import com.example.t.data.local.TokenManager
import com.example.t.data.repository.AuthRepository
import com.example.t.databinding.FragmentProfileBinding
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream

data class ProfileUiState(
    val isLoggedIn: Boolean = false,
    val username: String = "",
    val avatar: String? = null,
    val favoriteTeamName: String? = null,
    val favoriteTeamLogo: String? = null,
    val favoriteTeamRank: Int? = null
)

class ProfileViewModel : ViewModel() {
    private val _state = MutableStateFlow(ProfileUiState())
    val state = _state.asStateFlow()

    fun checkLogin(tokenManager: TokenManager) {
        if (tokenManager.isLoggedIn()) {
            val repo = AuthRepository(tokenManager)
            viewModelScope.launch {
                repo.getProfile().onSuccess { profile ->
                    _state.value = ProfileUiState(
                        isLoggedIn = true,
                        username = profile.username,
                        avatar = profile.avatar,
                        favoriteTeamName = profile.favoriteTeam?.name,
                        favoriteTeamLogo = profile.favoriteTeam?.logo,
                        favoriteTeamRank = profile.favoriteTeam?.rank
                    )
                }
            }
        } else {
            _state.value = ProfileUiState()
        }
    }

    fun logout(tokenManager: TokenManager) {
        viewModelScope.launch {
            AuthRepository(tokenManager).logout()
            _state.value = ProfileUiState()
        }
    }
}

class ProfileFragment : Fragment() {

    private var _binding: FragmentProfileBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ProfileViewModel by viewModels()

    private val photoPickerLauncher = registerForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null) {
            uploadAvatar(uri)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentProfileBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val tokenManager = TokenManager.getInstance(requireContext())

        binding.ivAvatar.setOnClickListener {
            if (viewModel.state.value.isLoggedIn) {
                photoPickerLauncher.launch(
                    androidx.activity.result.PickVisualMediaRequest(
                        ActivityResultContracts.PickVisualMedia.ImageOnly
                    )
                )
            }
        }

        binding.btnLogin.setOnClickListener {
            navigateSlide(R.id.navigation_login)
        }

        binding.btnSelectFav.setOnClickListener {
            navigateSlide(R.id.navigation_favorite_team)
        }

        binding.btnLogout.setOnClickListener {
            viewModel.logout(tokenManager)
            updateUI(ProfileUiState())
        }

        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.state.collect { state -> updateUI(state) }
        }

        viewModel.checkLogin(tokenManager)
    }

    private fun uploadAvatar(uri: Uri) {
        val tokenManager = TokenManager.getInstance(requireContext())
        val repo = AuthRepository(tokenManager)
        viewLifecycleOwner.lifecycleScope.launch {
            val tempFile = uriToTempFile(uri)
            if (tempFile == null) return@launch
            repo.uploadAvatar(tempFile).onSuccess { profile ->
                viewModel.checkLogin(tokenManager)
            }
        }
    }

    private fun uriToTempFile(uri: Uri): File? {
        return try {
            val inputStream = requireContext().contentResolver.openInputStream(uri) ?: return null
            val tempFile = File(requireContext().cacheDir, "avatar_upload.png")
            FileOutputStream(tempFile).use { out ->
                inputStream.copyTo(out)
            }
            inputStream.close()
            tempFile
        } catch (e: Exception) {
            null
        }
    }

    private fun updateUI(state: ProfileUiState) {
        if (state.isLoggedIn) {
            binding.btnLogin.visibility = View.GONE
            binding.btnLogout.visibility = View.VISIBLE
            binding.tvUsername.visibility = View.VISIBLE
            binding.tvUsername.text = state.username
            if (state.avatar != null) {
                binding.ivAvatar.load(state.avatar) {
                    placeholder(R.drawable.ic_profile)
                    error(R.drawable.ic_profile)
                    crossfade(true)
                }
            }

            if (state.favoriteTeamName != null) {
                binding.cardFavTeam.visibility = View.VISIBLE
                binding.ivFavLogo.load(state.favoriteTeamLogo) {
                    placeholder(R.drawable.ic_trophy)
                    error(R.drawable.ic_trophy)
                }
                binding.tvFavName.text = state.favoriteTeamName
                binding.tvFavRank.text = "排名: #${state.favoriteTeamRank}"
                binding.btnSelectFav.text = "更换主队"
            } else {
                binding.cardFavTeam.visibility = View.GONE
                binding.btnSelectFav.text = "选择主队"
            }
            binding.btnSelectFav.visibility = View.VISIBLE
        } else {
            binding.btnLogin.visibility = View.VISIBLE
            binding.btnLogout.visibility = View.GONE
            binding.btnSelectFav.visibility = View.GONE
            binding.tvUsername.visibility = View.GONE
            binding.cardFavTeam.visibility = View.GONE
        }
    }

    override fun onResume() {
        super.onResume()
        val tokenManager = TokenManager.getInstance(requireContext())
        viewModel.checkLogin(tokenManager)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
