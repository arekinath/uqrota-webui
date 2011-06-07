require 'rubygems'

task :compress do
  js = `find ./js -iname '*.js'`
  js.split("\n").each do |jsf|
    unless jsf.end_with?('.min.js')
      jscf = jsf.gsub(".js", ".min.js")
      puts "[COMPRESS #{jsf}]"
      puts `yuicompressor #{jsf} -o #{jscf}`
    end
  end
end

task :clean do
  minjs = `find ./js -iname '*.min.js'`
  minjs.split("\n").each do |jsf|
    `rm -f #{jsf}`
  end
end