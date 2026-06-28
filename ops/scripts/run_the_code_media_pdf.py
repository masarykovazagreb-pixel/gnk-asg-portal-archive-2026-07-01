from pathlib import Path

source_path = Path(__file__).with_name('build_the_code_media_pdf_v2.py')
source = source_path.read_text(encoding='utf-8')
source = source.replace("name='Bullet',", "name='BulletX',")
source = source.replace("P('• '+i,'Bullet')", "P('• '+i,'BulletX')")
compile(source, str(source_path), 'exec')
exec(compile(source, str(source_path), 'exec'), {'__name__': '__main__', '__file__': str(source_path)})
