<p align="center">
    <img src="https://raw.githubusercontent.com/openai-php/client/main/art/example.png" width="600" alt="OpenAI PHP">
    <p align="center">
        <a href="https://github.com/openai-php/client/actions"><img alt="GitHub Workflow Status (main)" src="https://img.shields.io/github/actions/workflow/status/openai-php/client/tests.yml?branch=main&label=tests&style=round-square"></a>
        <a href="https://packagist.org/packages/openai-php/client"><img alt="Total Downloads" src="https://img.shields.io/packagist/dt/openai-php/client"></a>
        <a href="https://packagist.org/packages/openai-php/client"><img alt="Latest Version" src="https://img.shields.io/packagist/v/openai-php/client"></a>
        <a href="https://packagist.org/packages/openai-php/client"><img alt="License" src="https://img.shields.io/github/license/openai-php/client"></a>
    </p>
</p>

------
**OpenAI PHP** is a community-maintained PHP API client that allows you to interact with the [Open AI API](https://platform.openai.com/docs/api-reference/introduction).

- Follow the creator Nuno Maduro:
    - YouTube: **[youtube.com/@nunomaduro](https://www.youtube.com/@nunomaduro)** — Videos every weekday
    - Twitch: **[twitch.tv/enunomaduro](https://www.twitch.tv/enunomaduro)** — Streams (almost) every weekday
    - Twitter / X: **[x.com/enunomaduro](https://x.com/enunomaduro)**
    - LinkedIn: **[linkedin.com/in/nunomaduro](https://www.linkedin.com/in/nunomaduro)**
    - Instagram: **[instagram.com/enunomaduro](https://www.instagram.com/enunomaduro)**
    - Tiktok: **[tiktok.com/@enunomaduro](https://www.tiktok.com/@enunomaduro)**

If you or your business relies on this package, it's important to support the developers who have contributed their time and effort to create and maintain this valuable tool:

- Nuno Maduro: **[github.com/sponsors/nunomaduro](https://github.com/sponsors/nunomaduro)**
- Sandro Gehri: **[github.com/sponsors/gehrisandro](https://github.com/sponsors/gehrisandro)**
- Connor Tumbleson: **[github.com/sponsors/iBotPeaches](https://github.com/sponsors/iBotPeaches)**

## Table of Contents
- [Get Started](#get-started)
- [Usage](#usage)
  - [Models Resource](#models-resource)
  - [Responses Resource](#responses-resource)
  - [Conversations Resource](#conversations-resource)
  - [Conversations Items Resource](#conversations-items-resource)
  - [Containers Resource](#containers-resource)
  - [Containers Files Resource](#containers-files-resource)
  - [Chat Resource](#chat-resource)
  - [Audio Resource](#audio-resource)
  - [Embeddings Resource](#embeddings-resource)
  - [Files Resource](#files-resource)
  - [FineTuning Resource](#finetuning-resource)
  - [Moderations Resource](#moderations-resource)
  - [Images Resource](#images-resource)
  - [Vector Stores Resource](#vector-stores-resource)
  - [Vector Stores Files Resource](#vector-store-files-resource)
  - [Vector Stores File Batches Resource](#vector-store-file-batches-resource)
  - [Batches Resource](#batches-resource)
  - [Realtime Ephemeral Keys](#realtime-ephemeral-keys)
  - [Completions Resource (legacy)](#completions-resource-legacy)
  - [Assistants Resource (deprecated)](#assistants-resource-deprecated)
  - [Thread Resource (deprecated)](#threads-resource-deprecated)
  - [Thread Messages Resource (deprecated)](#thread-messages-resource-deprecated)
  - [Thread Runs Resource (deprecated)](#thread-runs-resource-deprecated)
  - [Thread Runs Steps Resource (deprecated)](#thread-run-steps-resource-deprecated)
  - [FineTunes Resource (deprecated)](#finetunes-resource-deprecated)
  - [Edits Resource (deprecated)](#edits-resource-deprecated)
- [Meta Information](#meta-information)
- [Troubleshooting](#troubleshooting)
- [Testing](#testing)
- [Webhooks][#webhooks]
- [Services](#services)
  - [Azure](#azure)

## Get Started

> **Requires [PHP 8.2+](https://www.php.net/releases/)**

First, install OpenAI via the [Composer](https://getcomposer.org/) package manager:

```bash
composer require openai-php/client
```

Ensure that the `php-http/discovery` composer plugin is allowed to run or install a client manually if your project does not already have a PSR-18 client integrated.
```bash
composer require guzzlehttp/guzzle
```

Then, interact with OpenAI's API:

```php
$yourApiKey = getenv('YOUR_API_KEY');
$client = OpenAI::client($yourApiKey);

$response = $client->responses()->create([
    'model' => 'gpt-4o',
    'input' => 'Hello!',
]);

echo $response->outputText; // Hello! How can I assist you today?
```

If necessary, it is possible to configure and create a separate client.

```php
$yourApiKey = getenv('YOUR_API_KEY');

$client = OpenAI::factory()
    ->withApiKey($yourApiKey)
    ->withOrganization('your-organization') // default: null
    ->withProject('Your Project') // default: null
    ->withBaseUri('openai.example.com/v1') // default: api.openai.com/v1
    ->withHttpClient($httpClient = new \GuzzleHttp\Client([])) // default: HTTP client found using PSR-18 HTTP Client Discovery
    ->withHttpHeader('X-My-Header', 'foo')
    ->withQueryParam('my-param', 'bar')
    ->withStreamHandler(fn (RequestInterface $request): ResponseInterface => $httpClient->send($request, [
        'stream' => true // Allows to provide a custom stream handler for the http client.
    ]))
    ->make();
```

## Usage

### `Models` Resource

#### `list`

Lists the currently available models, and provides basic information about each one such as the owner and availability.

```php
$response = $client->models()->list();

$response->object; // 'list'

foreach ($response->data as $result) {
    $result->id; // 'gpt-3.5-turbo-instruct'
    $result->object; // 'model'
    // ...
}

$response->toArray(); // ['object' => 'list', 'data' => [...]]
```

#### `retrieve`

Retrieves a model instance, providing basic information about the model such as the owner and permissioning.

```php
$response = $client->models()->retrieve('gpt-3.5-turbo-instruct');

$response->id; // 'gpt-3.5-turbo-instruct'
$response->object; // 'model'
$response->created; // 1642018370
$response->ownedBy; // 'openai'

$response->toArray(); // ['id' => 'gpt-3.5-turbo-instruct', ...]
```

#### `delete`

Delete a fine-tuned model.

```php
$response = $client->models()->delete('curie:ft-acmeco-2021-03-03-21-44-20');

$response->id; // 'curie:ft-acmeco-2021-03-03-21-44-20'
$response->object; // 'model'
$response->deleted; // true

$response->toArray(); // ['id' => 'curie:ft-acmeco-2021-03-03-21-44-20', ...]
```

### `Responses` Resource

#### `create`

Creates a model response. Provide text or image inputs to generate text or JSON outputs. Have the model call your own custom code or use built-in tools like web search or file search to use your own data as input for the model's response.

```php
$response = $client->responses()->create([
    'model' => 'gpt-4o-mini',
    'tools' => [
        [
            'type' => 'web_search_preview'
        ]
    ],
    'input' => "what was a positive news story from today?",
    'temperature' => 0.7,
    'max_output_tokens' => 150,
    'tool_choice' => 'auto',
    'parallel_tool_calls' => true,
    'store' => true,
    'metadata' => [
        'user_id' => '123',
        'session_id' => 'abc456'
    ]
]);

$response->id; // 'resp_67ccd2bed1ec8190b14f964abc054267'
$response->object; // 'response'
$response->createdAt; // 1741476542
$response->status; // 'completed'
$response->model; // 'gpt-4o-mini'
$response->outputText; // 'The combined response text of any `output_text` content.'

foreach ($response->output as $output) {
    $output->type; // 'message'
    $output->id; // 'msg_67ccd2bf17f0819081ff3bb2cf6508e6'
    $output->status; // 'completed'
    $output->role; // 'assistant'
    
    foreach ($output->content as $content) {
        $content->type; // 'output_text'
        $content->text; // The response text
        $content->annotations; // Any annotations in the response
    }
}

$response->usage->inputTokens; // 36
$response->usage->outputTokens; // 87
$response->usage->totalTokens; // 123

$response->toArray(); // ['id' => 'resp_67ccd2bed1ec8190b14f964abc054267', ...]
```

Create a model response with a function tool.

```php
$response = $client->responses()->create([
    'model' => 'gpt-4o-mini',
    'tools' => [
        [
            'type' => 'function',
            'name' => 'get_temperature',
            'description' => 'Get the current temperature in a given location',
            'parameters' => [
                'type' => 'object',
                'properties' => [
                    'location' => [
                        'type' => 'string',
                        'description' => 'The city and state, e.g. San Francisco, CA',
                    ],
                    'unit' => [
                        'type' => 'string',
                        'enum' => ['celsius', 'fahrenheit'],
                    ],
                ],
                'required' => ['location'],
            ],
        ]
    ],
    'input' => "What is the temperature in Rio Grande do Norte, Brazil?",
]);

foreach ($response->output as $item) {
    if ($item->type === 'function_call') {
        $name = $item->name ?? null;
        $args = json_decode($item->arguments ?? '{}', true) ?: [];

        if ($name === 'get_temperature') {
            // ✅ Call your custom function here with the extracted arguments
            // Example:
            // $temperature = get_temperature($args['location'], $args['unit'] ?? 'celsius');
            // Then, send the result back to the model if needed.
        }
    }
}
```

#### `create streamed`

When you create a Response with stream set to true, the server will emit server-sent events to the client as the Response is generated. All events and their payloads can be found in [OpenAI docs](https://platform.openai.com/docs/api-reference/responses-streaming).

```php
$stream = $client->responses()->createStreamed([
    'model' => 'gpt-4o-mini',
    'tools' => [
        [
            'type' => 'web_search_preview'
        ]
    ],
    'input' => "what was a positive news story from today?",
]);

foreach ($stream as $response) {
    $response->event; // 'response.created'
}
```

#### `retrieve`

Retrieves a model response with the given ID.

```php
$response = $client->responses()->retrieve('resp_67ccd2bed1ec8190b14f964abc054267');

$response->id; // 'resp_67ccd2bed1ec8190b14f964abc054267'
$response->object; // 'response'
$response->createdAt; // 1741476542
$response->status; // 'completed'
$response->error; // null
$response->incompleteDetails; // null
$response->instructions; // null
$response->maxOutputTokens; // null
$response->model; // 'gpt-4o-mini-2024-07-18"'
$response->parallelToolCalls; // true
$response->previousResponseId; // null
$response->store; // true
$response->temperature; // 1.0
$response->toolChoice; // 'auto'
$response->topP; // 1.0
$response->truncation; // 'disabled'

$response->toArray(); // ['id' => 'resp_67ccd2bed1ec8190b14f964abc054267', ...]
```

#### `retrieve streamed`

When you retrieve a Response with stream set to true, the server will emit server-sent events to the client as the Response is generated. All events and their payloads can be found in [OpenAI docs](https://platform.openai.com/docs/api-reference/responses-streaming).

```php
$stream = $client->responses()->retrieveStreamed('resp_67ccd2bed1ec8190b14f964abc054267', [
    'starting_after' => '2',
]);

foreach ($stream as $response) {
    $response->event; // 'response.created'
}
```

#### `cancel`

Cancel a model response (background request) with the given ID.

```php
$response = $client->responses()->cancel('resp_67ccd2bed1ec8190b14f964abc054267');

$response->id; // 'resp_67ccd2bed1ec8190b14f964abc054267'
$response->status; // 'canceled'

$response->toArray(); // ['id' => 'resp_67ccd2bed1ec8190b14f964abc054267', 'status' => 'canceled', ...]
```

#### `delete`

Deletes a model response with the given ID.

```php
$response = $client->responses()->delete('resp_67ccd2bed1ec8190b14f964abc054267');

$response->id; // 'resp_67ccd2bed1ec8190b14f964abc054267'
$response->object; // 'response'
$response->deleted; // true

$response->toArray(); // ['id' => 'resp_67ccd2bed1ec8190b14f964abc054267', 'deleted' => true, ...]
```

#### `list`

Lists input items for a response with the given ID. All events and their payloads can be found in [OpenAI docs](https://platform.openai.com/docs/api-reference/responses/list).

```php
$response = $client->responses()->list('resp_67ccd2bed1ec8190b14f964abc054267', [
    'limit' => 10,
    'order' => 'desc'
]);

$response->object; // 'list'

foreach ($response->data as $item) {
    $item->type; // 'message'
    $item->id; // 'msg_680bf4e8c1948192b64abf0bad54b30806e0834f49400fc3'
    $item->status; // 'completed'
    $item->role; // 'user'
}

$response->firstId; // 'msg_680bf4e8c1948192b64abf0bad54b30806e0834f49400fc3'
$response->lastId; // 'msg_680bf4e8c1948192b64abf0bad54b30806e0834f49400fc3'
$response->hasMore; // false

$response->toArray(); // ['object' => 'list', 'data' => [...], ...]
```

### `Conversations` Resource

#### `create`

Create a conversation.

```php
$response = $client->conversations()->create([
    'metadata' => ['topic' => 'demo'],
    'items' => [
        [
            'type' => 'message',
            'role' => 'user',
            'content' => 'Hello!'
        ],
    ],
]);

$response->id; // 'conv_123'
$response->object; // 'conversation'
$response->createdAt; // 1741900000
$response->metadata; // ['topic' => 'demo']

$response->toArray(); // ['id' => 'conv_123', 'object' => 'conversation', ...]
```

#### `retrieve`

Retrieve a conversation by ID.

```php
$response = $client->conversations()->retrieve('conv_123');

$response->id; // 'conv_123'
$response->object; // 'conversation'
$response->createdAt; // 1741900000

$response->toArray(); // ['id' => 'conv_123', 'object' => 'conversation', ...]
```

#### `update`

Update a conversation by ID.

```php
$response = $client->conversations()->update('conv_123', [
    'metadata' => ['foo' => 'bar'],
]);

$response->id; // 'conv_123'
$response->metadata; // ['foo' => 'bar']
```

#### `delete`

Delete a conversation by ID.

```php
$response = $client->conversations()->delete('conv_123');

$response->id; // 'conv_123'
$response->object; // 'conversation.deleted'
$response->deleted; // true

$response->toArray(); // ['id' => 'conv_123', 'object' => 'conversation.deleted', 'deleted' => true]
```

### `Conversations Items` Resource

#### `create`

Create items for a conversation.

```php
$response = $client->conversations()->items()->create('conv_123', [
    'items' => [
        [
            'role' => 'system',
            'content' => 'Refer to me as PHPBot.',
        ],
    ],
]);

foreach ($response->data as $listItem) {
    $listItem->item; // The created item (e.g., message)
}

$response->firstId; // 'msg_abc'
$response->lastId; // 'msg_abc'
$response->hasMore; // false

$response->toArray(); 

> _README 过长已截断, 完整内容请查看 GitHub 仓库。_
