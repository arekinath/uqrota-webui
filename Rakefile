require 'rubygems'
require 'sprockets'

task :build do
  
  
  js = `find ./js/src -iname '*.js'`
  js.split("\n").each do |jsf|
    puts "[SPROCKET] #{jsf}"
    secretary = Sprockets::Secretary.new(
      :load_path => ["js/lib/prototype/src", "js/lib/scriptaculous/src", "js/lib"],
      :source_files => [jsf]
    )
    secretary.save_to("js/#{File.basename(jsf)}")
    
    jscf = jsf.gsub(".js", ".min.js")
    puts "[COMPRESS] #{jsf}"
    puts `yuicompressor #{jsf} -o #{jscf}`
  end
end

task :clean do
  minjs = `find ./js -iname '*.min.js'`
  minjs.split("\n").each do |jsf|
    `rm -f #{jsf}`
  end
end