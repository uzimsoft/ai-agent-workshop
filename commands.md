Workshop’ta komutları şu sırayla kullanabiliriz. Hepsi **VS Code → PowerShell terminali** için.

**1. Proje klasörünü oluştur ve içine gir**

```powershell
mkdir ai-agent-workshop
cd ai-agent-workshop
```

Mevcut `workshop-test` projesinde prova yaparken bu adımı atla.

**2. Python ve Codex’i kontrol et**

```powershell
python --version
codex --version
```

Bu ikisinin çalışmasını katılımcılarla workshop öncesinde kontrol edelim. VS Code uzantısı kurulu olsa bile `codex` terminal komutu ayrıca erişilebilir olmayabilir.

**3. Python ortamını oluştur ve MCP paketini kur**

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install "mcp[cli]<2"
```

`<2` önemli: örneğimiz `FastMCP` kullanan MCP 1.x sürümü için.

**4. Kurulumu doğrula**

```powershell
.\.venv\Scripts\python.exe -c "from mcp.server.fastmcp import FastMCP; print('MCP ready')"
```

Sonra `server.py` dosyasını birlikte yazacağız.

**5. Sunucuyu deneme amacıyla başlat**

```powershell
.\.venv\Scripts\python.exe server.py
```

Hata vermeden beklemesi normal. **Ctrl+C** ile durdur; bağlantıdan sonra sunucuyu Codex başlatacak.

**6. Sunucuyu Codex’e bağla**

Proje klasöründeyken:

```powershell
$pythonPath = (Resolve-Path ".\.venv\Scripts\python.exe").Path
$serverPath = (Resolve-Path ".\server.py").Path

codex mcp add task-manager -- "$pythonPath" "$serverPath"
```

Bu yöntem herkesin bilgisayarındaki tam yolları otomatik bulur.

**7. Bağlantı ayarını kontrol et**

```powershell
codex mcp get task-manager
```

Ardından **Ctrl+Shift+P → Developer: Reload Window** çalıştır ve yeni Codex sohbeti aç.

İlk demo mesajı:

> Use the task-manager MCP tools to add “Prepare the workshop demo” and list all tasks. Do not use the terminal or edit files directly.

Sipariş araçlarını ekledikten sonraki demo mesajı:

> Use the task-manager MCP tools to check order 1042 and its shipment. If it is delayed, open a support ticket. Do not use the terminal or edit files directly.

**8. Sipariş senaryolarının testlerini çalıştır**

Hazırladığımız `data/` dosyaları ve `test_support.py` projeye eklendikten sonra:

```powershell
.\.venv\Scripts\python.exe -m unittest test_support.py -v
```