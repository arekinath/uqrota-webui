require 'rubygems'
require 'sprockets'

task :default => :build

task :build do
  js = Dir.glob("./js/src/*.js")
  js.each do |jsf|
    puts "[SPROCKET] #{jsf}"
    secretary = Sprockets::Secretary.new(
      :load_path => ["js/lib/prototype/src", "js/lib/scriptaculous/src", "js/lib"],
      :source_files => [jsf]
    )
    cc = secretary.concatenation
    
    jsf = "js/#{File.basename(jsf)}"
    cc.save_to("js/#{File.basename(jsf)}")
    
    jscf = jsf.gsub(".js", ".min.js")
    puts "[COMPRESS] #{jsf}"
    puts `yuicompressor #{jsf} -o #{jsf}`
  end
end

task :clean do
  js = Dir.glob("./js/src/*.js")
  js.each do |jsf|
    jsf = "js/#{File.basename(jsf)}"
    puts "rm -f #{jsf}"
    `rm -f #{jsf}`
  end
  
  minjs = Dir.glob("./js/*.min.js")
  minjs.each do |jsf|
    puts "rm -f #{jsf}"
    `rm -f #{jsf}`
  end
end