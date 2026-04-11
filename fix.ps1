$file = 'C:\Users\webre\Desktop\ContentSeller\guidehub\src\stores\authStore.ts'
$content = Get-Content $file -Raw
$old = \"console.error('Failed to update profile:', err)
    }\"
$new = \"console.error('Failed to update profile:', err)
      throw err
    }\"
$content = $content.Replace($old, $new)
Set-Content $file $content -NoNewline
