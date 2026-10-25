"""File adapter for the existing, failure-tested release engine. No FTP connection.
Only the marked domain's public files and CI backup/staging metadata are reachable.
"""
from pathlib import Path,PurePosixPath
import os,ftplib
class LocalFiles:
    def __init__(self,root):
        self.root=Path(root).resolve()
        if self.root.name!='liberpro.pl' or self.root.parent.name!='domains':raise ValueError('Wrong domain directory')
        if (self.root/'public_html').is_symlink() or not (self.root/'public_html').is_dir():raise ValueError('WWW must be a real directory')
    def pwd(self):return '/'
    def path(self,name):
        p=PurePosixPath(name)
        if p.is_absolute() or '..' in p.parts or '\\' in name or any(ord(c)<32 for c in name):raise ValueError('Unsafe local release path')
        if not (p.parts[0] in ['public_html','ci-staging','ci-backups'] or name in ['.liberpro-cicd-target.json','.liberpro-cicd-state.json','.liberpro-cicd-state.json.partial','.liberpro-cicd-state.json.restore']):raise ValueError('Outside deployment scope')
        target=self.root.joinpath(*p.parts)
        for part in [target]+list(target.parents):
            if part==self.root:break
            if part.is_symlink():raise ValueError('Symlinks are forbidden in release paths')
        if self.root not in target.resolve().parents and target.resolve()!=self.root:raise ValueError('Path escaped domain root')
        return target
    def retrbinary(self,cmd,write):
        if not cmd.startswith('RETR '):raise ValueError('Unsupported command')
        try:
            with self.path(cmd[5:]).open('rb') as file:
                while True:
                    block=file.read(65536)
                    if not block:break
                    write(block)
        except FileNotFoundError:raise ftplib.error_perm('550 Missing')
    def storbinary(self,cmd,stream):
        if not cmd.startswith('STOR '):raise ValueError('Unsupported command')
        path=self.path(cmd[5:]);fd=os.open(str(path),os.O_CREAT|os.O_TRUNC|os.O_WRONLY|getattr(os,'O_NOFOLLOW',0),0o600)
        with os.fdopen(fd,'wb') as file:
            while True:
                block=stream.read(65536)
                if not block:break
                file.write(block)
            file.flush();os.fsync(file.fileno())
    def mkd(self,name):
        try:self.path(name).mkdir(mode=0o755 if name.startswith('public_html/') else 0o700)
        except FileExistsError:raise ftplib.error_perm('550 Exists')
    def rename(self,source,destination):
        a=self.path(source);b=self.path(destination)
        if destination.startswith('public_html/'):a.chmod(0o644)
        os.replace(str(a),str(b))
    def delete(self,name):self.path(name).unlink()
