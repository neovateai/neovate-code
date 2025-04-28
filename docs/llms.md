# LLMs

Takumi leverages Large Language Models (LLMs) to understand prompts, generate code, answer questions, and perform various development tasks. Proper configuration is essential to connect Takumi to your preferred LLM providers.

This document explains how to configure API keys, select models (including using aliases), and control other LLM-related settings.

## API Key Configuration

Takumi requires API keys to authenticate with LLM providers. You can provide these keys in several ways, listed in order of precedence (highest first):

1.  **Command-Line Flags (Highest Precedence):**
    You can provide API keys directly using the `--api-key` flag. Use the format `<provider>=<key>`. You can use this flag multiple times for different providers.

    ```bash
    takumi "Refactor this function" --model gpt-4o --api-key openai=sk-... --api-key groq=gsk_...
    ```
    *Note: Replace `<provider>` with the lowercase name of the provider (e.g., `openai`, `groq`, `deepseek`, `google`, `openrouter`).*

2.  **`.env` File (Recommended):**
    Create a file named `.env` in your project's root directory (or your home directory). Takumi automatically loads environment variables from this file using `dotenv`.

    ```dotenv
    # .env file content
    OPENAI_API_KEY=sk-...
    GROQ_API_KEY=gsk_...
    DEEPSEEK_API_KEY=sk-...
    GOOGLE_API_KEY=AIza...
    OPEN_ROUTER_API_KEY=sk-or-...
    # Add other provider keys as needed
    ```

3.  **Environment Variables:**
    If you have API keys set as environment variables directly in your shell session, Takumi will use them if they are not overridden by a `.env` file or CLI flags.

## Model Selection

You can specify which LLM Takumi should use for its primary tasks and optionally specify a different, often faster or cheaper, model for simpler tasks.

*   **Primary Model (`-m, --model`):**
    This flag sets the main LLM used for complex reasoning, code generation, and detailed responses.

    **Syntax:** `--model <ModelType>`

    `<ModelType>` can be:
    *   A full model identifier: `Provider/ModelName` (e.g., `OpenAI/gpt-4o`, `Groq/qwen-qwq-32b`).
    *   A model alias (see below).

    ```bash
    $ takumi "Implement the feature described in issue #123" --model OpenAI/gpt-4o
    ```

*   **Small Model (`--small-model`):**
    This flag sets a secondary LLM, typically used for less demanding tasks like generating commit messages, initial planning steps (if `--plan-model` isn't set), or quick lookups where speed is preferred over maximum capability. If not specified, it defaults to the value of `--model`.

    **Syntax:** `--small-model <ModelType>`

    ```bash
    # Use GPT-4o for main tasks, but a faster model for simpler ones
    $ takumi commit --stage --model OpenAI/gpt-4o --small-model Groq/qwen-qwq-32b
    ```

*   **Plan Model (`--plan-model`):**
    When using `takumi --plan`, this flag specifically sets the model used *only* for generating the execution plan. If not specified, it defaults to the value of `--small-model` (or `--model` if `--small-model` is also not set).

    **Syntax:** `--plan-model <ModelType>`

    ```bash
    $ takumi act "Refactor database logic" --plan --model OpenAI/gpt-4o --plan-model Google/gemini-2.5-flash-preview-04-17
    ```

## 3. Model Aliases

To simplify model selection, Takumi provides short aliases for commonly used models. You can use these aliases with the `--model`, `--small-model`, and `--plan-model` flags.

**Available Aliases:**

*   `sonnet-3.5`: `OpenRouter/anthropic/claude-3.5-sonnet`
*   `sonnet`: `OpenRouter/anthropic/claude-3.7-sonnet`
*   `qwq`: `Groq/qwen-qwq-32b`
*   `deepseek`: `DeepSeek/deepseek-chat`
*   `r1`: `DeepSeek/deepseek-reasoner`
*   `41`: `OpenAI/gpt-4.1`
*   `o1`: `OpenAI/o1`
*   `4`: `OpenAI/gpt-4`
*   `4o`: `OpenAI/gpt-4o`
*   `3`: `OpenAI/gpt-3.5-turbo`
*   `flash`: `Google/gemini-2.5-flash-preview-04-17`
*   `gemini`: `Google/gemini-2.5-pro-exp-03-25`
*   `grok`: `Grok/grok-3-fast-beta`
*   `quasar`: `OpenRouter/openrouter/quasar-alpha`
*   `optimus`: `OpenRouter/openrouter/optimus-alpha`

**Example using an alias:**

```bash
# Using the '4o' alias for OpenAI/gpt-4o
$ takumi ask "Explain this code block" --model 4o
```

## Streaming Responses

By default, Takumi streams responses from the LLM, displaying the output token by token as it's generated. This provides faster feedback.

*   **Disabling Streaming:** You can disable this behavior using the `--stream false` flag.

    ```bash
    $ takumi ask "List all dependencies" --stream false
    ```

## Choosing a Model

Consider the following when selecting models:

*   **Capability:** More powerful models (like GPT-4o, Claude 3.x Sonnet, DeepSeek Reasoner) are better for complex coding and reasoning but cost more.
*   **Speed:** Models optimized for speed (like Groq's offerings, Gemini Flash, GPT-4o-mini) are excellent for the `--small-model` or `--plan-model` roles, providing quicker responses for simpler tasks.
*   **Cost:** Check the pricing of each provider.
*   **Context Window:** Ensure the model's context window is sufficient for the amount of code/context Takumi might send.
*   **Tool Use:** Some models have better support for function/tool calling than others. Experimentation might be needed.

It's often beneficial to use a highly capable model for `--model` and a faster, cheaper model for `--small-model`.
