package com.example.t.ui.profile.login

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import com.example.t.data.local.TokenManager
import com.example.t.data.repository.AuthRepository
import com.example.t.databinding.FragmentLoginBinding
import kotlinx.coroutines.launch

class LoginFragment : Fragment() {

    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.toolbar.setNavigationOnClickListener {
            parentFragmentManager.popBackStack()
        }

        val tokenManager = TokenManager.getInstance(requireContext())
        val repository = AuthRepository(tokenManager)

        binding.btnLogin.setOnClickListener {
            val username = binding.etUsername.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            if (username.isEmpty() || password.isEmpty()) {
                binding.tvError.visibility = View.VISIBLE
                binding.tvError.text = "请填写用户名和密码"
                return@setOnClickListener
            }
            binding.tvError.visibility = View.GONE
            binding.btnLogin.isEnabled = false

            viewLifecycleOwner.lifecycleScope.launch {
                repository.login(username, password).onSuccess {
                    navigateBack()
                }.onFailure { e ->
                    binding.tvError.visibility = View.VISIBLE
                    binding.tvError.text = "登录失败: ${e.message}"
                    binding.btnLogin.isEnabled = true
                }
            }
        }

        binding.btnRegister.setOnClickListener {
            val username = binding.etUsername.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()
            if (username.isEmpty() || password.length < 6) {
                binding.tvError.visibility = View.VISIBLE
                binding.tvError.text = "用户名不能为空，密码至少6位"
                return@setOnClickListener
            }
            binding.tvError.visibility = View.GONE
            binding.btnRegister.isEnabled = false

            viewLifecycleOwner.lifecycleScope.launch {
                repository.register(username, password).onSuccess {
                    navigateBack()
                }.onFailure { e ->
                    binding.tvError.visibility = View.VISIBLE
                    binding.tvError.text = "注册失败: ${e.message}"
                    binding.btnRegister.isEnabled = true
                }
            }
        }
    }

    private fun navigateBack() {
        parentFragmentManager.popBackStack()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
